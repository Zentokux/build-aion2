"""Shared helpers for the oria hook scripts (stdlib only, Windows + macOS)."""

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

IS_WINDOWS = os.name == "nt"
VALIDATOR_TIMEOUT = 300
OUTPUT_TAIL_LINES = 30
DEFAULT_CONFIG = {
    # "auto": run the project validator after each edit only while it is fast
    # (<= slow_seconds); slower validators run once, when Claude finishes.
    "validator_on_edit": "auto",  # auto | always | never
    "slow_seconds": 3,
}


def setup_stdio():
    # Windows consoles default to cp1252; hook output must be UTF-8.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass


def read_payload():
    try:
        raw = sys.stdin.buffer.read().decode("utf-8-sig", errors="replace")
        return json.loads(raw) if raw.strip() else {}
    except (ValueError, OSError):
        return {}


def emit(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False))
    sys.stdout.flush()


def project_dir(payload):
    d = os.environ.get("CLAUDE_PROJECT_DIR") or payload.get("cwd") or os.getcwd()
    return os.path.abspath(d)


def has_project_install(proj):
    return (Path(proj) / ".claude" / "oria" / "post_edit.py").is_file()


def python_hint():
    """How the user should call Python in their terminal (for printed commands)."""
    if IS_WINDOWS:
        return "py" if shutil.which("py") else "python"
    return "python3"


def run(cmd, cwd=None, env=None, timeout=60, input_text=None):
    # Child Python processes (e.g. validate.py) would print in cp1252 on
    # Windows when piped; force UTF-8 so accents like "ñ" survive.
    env = dict(env if env is not None else os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    kwargs = {}
    if IS_WINDOWS:
        kwargs["creationflags"] = 0x08000000  # CREATE_NO_WINDOW
    return subprocess.run(
        cmd,
        cwd=cwd,
        env=env,
        input=input_text,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        **kwargs,
    )


ANSI_RE = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")


ERROR_RE = re.compile(
    r"\b(fail(ed|ure|s)?|errors?|exception|traceback|fatal|assert\w*|warn(ing)?s?)\b|[✗✘❌⚠]|^\s*!", re.I)
SUMMARY_LINES = 5
MAX_LINE = 400


def _clip(line):
    # very long lines (flattened tracebacks, minified code): the start says
    # where, the end says what went wrong; the middle is rarely useful
    if len(line) <= MAX_LINE:
        return line
    half = MAX_LINE // 2
    return f"{line[:half]} … {line[-half:]}"


def tail(text, n=OUTPUT_TAIL_LINES):
    """Clean, size-limited excerpt that never drops the error lines.

    Short output is returned whole. Long output keeps every line that looks
    like an error (plus the line after it, often the detail) and the last
    lines (usually the summary), in their original order.
    """
    # color codes are noise for Claude and cost tokens
    lines = [_clip(l.rstrip()) for l in ANSI_RE.sub("", text or "").splitlines() if l.strip()]
    if len(lines) <= n:
        return "\n".join(lines)
    keep = set(range(len(lines) - SUMMARY_LINES, len(lines)))
    found_errors = False
    for i, line in enumerate(lines):
        if len(keep) >= n:
            break
        if ERROR_RE.search(line):
            found_errors = True
            keep.update(j for j in (i, i + 1) if j < len(lines))
    if not found_errors:  # unknown output format: show as much of the end as fits
        for j in range(len(lines) - 1, -1, -1):
            if len(keep) >= n:
                break
            keep.add(j)
    out, prev = [], -1
    for i in sorted(keep):
        if i != prev + 1:
            out.append("...")
        out.append(lines[i])
        prev = i
    problems = sum(1 for l in lines if ERROR_RE.search(l))
    out.append(f"[{len(keep)} of {len(lines)} lines shown, {problems} problem lines in total; "
               "fix these, the next check shows the rest. Run the validator to see everything.]")
    return "\n".join(out)


# ---- project validator ---------------------------------------------------------

def find_validator(proj):
    """Return the command that runs the project's own validator, or None.

    Looked up in this order: validate.py and validate.mjs / validate.js (work
    everywhere), validate.ps1 (Windows / pwsh), validate.sh (macOS, Linux,
    Git Bash on Windows).
    """
    from checkers import find_bash, find_powershell  # local import: same folder

    p = Path(proj)
    if (p / "validate.py").is_file():
        return [sys.executable, str(p / "validate.py")]
    for name in ("validate.mjs", "validate.js"):
        if (p / name).is_file():
            node = shutil.which("node")
            if node:
                return [node, str(p / name)]
    if (p / "validate.ps1").is_file():
        ps = find_powershell()
        if ps:
            return [ps, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", str(p / "validate.ps1")]
    if (p / "validate.sh").is_file():
        bash = find_bash()
        if bash:
            return [bash, str(p / "validate.sh")]
    return None


def run_validator(proj):
    """Run the project validator. Returns (ok, name, output). ok=True if none exists.

    Also records how long it took (used by the "auto" mode).
    """
    cmd = find_validator(proj)
    if cmd is None:
        return True, None, ""
    name = Path(cmd[-1]).name
    start = time.monotonic()
    try:
        r = run(cmd, cwd=proj, timeout=VALIDATOR_TIMEOUT)
    except subprocess.TimeoutExpired:
        update_cache(proj, validator_seconds=VALIDATOR_TIMEOUT)
        return False, name, f"{name} did not finish in {VALIDATOR_TIMEOUT}s"
    except OSError as e:
        return True, name, f"could not run {name}: {e}"  # broken runner is not a code error
    update_cache(proj, validator_seconds=round(time.monotonic() - start, 2))
    return r.returncode == 0, name, tail((r.stdout or "") + "\n" + (r.stderr or ""))


# ---- per-project config and cache ------------------------------------------------

def load_config(proj):
    cfg = dict(DEFAULT_CONFIG)
    try:
        user = json.loads((Path(proj) / ".claude" / "oria.json").read_text(encoding="utf-8-sig"))
        if isinstance(user, dict):
            cfg.update(user)
    except (OSError, ValueError):
        pass
    return cfg


def _cache_path(proj):
    return Path(proj) / ".claude" / "oria-cache.json"


def load_cache(proj):
    try:
        data = json.loads(_cache_path(proj).read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def update_cache(proj, **values):
    data = load_cache(proj)
    data.update(values)
    try:
        p = _cache_path(proj)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(data), encoding="utf-8")
    except OSError:
        pass  # a cache we cannot write only costs speed, never correctness


def fingerprint(text):
    return hashlib.sha1((text or "").encode("utf-8")).hexdigest()


def main_guard(fn):
    """Run a hook entry point; a crash in our code must never break the session."""
    setup_stdio()
    try:
        fn()
    except Exception as e:  # noqa: BLE001
        try:
            emit({"systemMessage": f"[oria] hook error (ignored): {type(e).__name__}: {e}"})
        except Exception:  # noqa: BLE001
            pass
    sys.exit(0)
