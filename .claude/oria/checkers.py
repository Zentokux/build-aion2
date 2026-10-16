"""Per-file syntax checkers.

Each checker takes a path and returns None (ok / skipped) or an error string
with file:line when possible. Checkers that need an external tool skip
silently when the tool is not installed.
"""

import ast
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

IS_WINDOWS = os.name == "nt"
TOOL_TIMEOUT = 20

JSONC_NAMES = {"devcontainer.json", ".eslintrc.json", "launch.json", "tasks.json"}
JSONC_PREFIXES = ("tsconfig", "jsconfig")


def _read_text(path):
    # utf-8-sig accepts files saved with a BOM (common on Windows editors)
    with open(path, "r", encoding="utf-8-sig") as f:
        return f.read()


def _first_line(text, fallback):
    for line in (text or "").splitlines():
        if line.strip():
            return line.strip()
    return fallback


def _run(cmd, cwd=None, env=None):
    kwargs = {}
    if IS_WINDOWS:
        kwargs["creationflags"] = 0x08000000  # CREATE_NO_WINDOW
    return subprocess.run(
        cmd,
        cwd=cwd,
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=TOOL_TIMEOUT,
        **kwargs,
    )


# ---- python / json / yaml ---------------------------------------------------

def check_python(path):
    try:
        ast.parse(_read_text(path), filename=path)
    except SyntaxError as e:
        return f"{path}:{e.lineno or '?'}:{e.offset or '?'}: Python syntax error: {e.msg}"
    except (UnicodeDecodeError, ValueError) as e:
        return f"{path}: could not parse: {e}"
    return None


def is_jsonc(path):
    p = Path(path)
    name = p.name.lower()
    if p.suffix.lower() == ".jsonc" or name in JSONC_NAMES:
        return True
    if name.startswith(JSONC_PREFIXES):
        return True
    return p.parent.name.lower() == ".vscode"


def strip_jsonc(text):
    """Remove // and /* */ comments and trailing commas, keeping strings intact.

    Newlines are preserved so line numbers in errors still match the file.
    """
    out = []
    i, n = 0, len(text)
    in_str = False
    while i < n:
        c = text[i]
        if in_str:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(text[i + 1])
                i += 2
                continue
            if c == '"':
                in_str = False
            i += 1
        elif c == '"':
            in_str = True
            out.append(c)
            i += 1
        elif text.startswith("//", i):
            while i < n and text[i] != "\n":
                i += 1
        elif text.startswith("/*", i):
            end = text.find("*/", i + 2)
            end = n if end == -1 else end + 2
            out.append("\n" * text.count("\n", i, end))
            i = end
        else:
            out.append(c)
            i += 1
    cleaned = "".join(out)
    # trailing commas before } or ]
    result = []
    in_str = False
    i, n = 0, len(cleaned)
    while i < n:
        c = cleaned[i]
        if in_str:
            result.append(c)
            if c == "\\" and i + 1 < n:
                result.append(cleaned[i + 1])
                i += 2
                continue
            if c == '"':
                in_str = False
        elif c == '"':
            in_str = True
            result.append(c)
        elif c == ",":
            j = i + 1
            while j < n and cleaned[j] in " \t\r\n":
                j += 1
            if j < n and cleaned[j] in "}]":
                i += 1
                continue
            result.append(c)
        else:
            result.append(c)
        i += 1
    return "".join(result)


def check_json(path):
    try:
        text = _read_text(path)
        if is_jsonc(path):
            text = strip_jsonc(text)
        if not text.strip():
            return None
        json.loads(text)
    except json.JSONDecodeError as e:
        kind = "JSONC" if is_jsonc(path) else "JSON"
        return f"{path}:{e.lineno}:{e.colno}: {kind} error: {e.msg}"
    except (UnicodeDecodeError, ValueError) as e:
        return f"{path}: could not parse: {e}"
    return None


def check_yaml(path):
    try:
        import yaml  # type: ignore
    except ImportError:
        return None
    try:
        list(yaml.safe_load_all(_read_text(path)))
    except yaml.YAMLError as e:
        mark = getattr(e, "problem_mark", None)
        where = f"{mark.line + 1}:{mark.column + 1}" if mark else "?"
        return f"{path}:{where}: YAML error: {_first_line(str(e), 'invalid YAML')}"
    except (UnicodeDecodeError, ValueError) as e:
        return f"{path}: could not parse: {e}"
    return None


# ---- external tools ----------------------------------------------------------

def check_js(path):
    node = shutil.which("node")
    if not node:
        return None
    r = _run([node, "--check", path])
    if r.returncode != 0:
        return f"{path}: JavaScript syntax error: {_node_error(r.stderr, path)}"
    return None


def _node_error(stderr, path):
    # node prints "file:line" then the code line, a caret, then "SyntaxError: ..."
    lines = [l for l in (stderr or "").splitlines() if l.strip()]
    loc = next((l for l in lines if l.startswith(path) or ":" in l[:3] or l.endswith(tuple("0123456789"))), "")
    err = next((l for l in lines if "Error" in l), _first_line(stderr, "syntax error"))
    if loc and loc != err:
        return f"{err.strip()} (at {loc.strip()})"
    return err.strip()


# TypeScript: syntax-only diagnostics via the project's own `typescript`
# package. Type errors (missing imports, JSX config, etc.) are NOT reported,
# so there are no false positives on single-file checks.
_TS_SCRIPT = r"""
const path = require('path');
const fs = require('fs');
const file = process.env.ORIA_FILE;
let ts;
try {
  ts = require(require.resolve('typescript', { paths: [path.dirname(file), process.cwd()] }));
} catch (e) { process.exit(0); }
if (typeof ts.createSourceFile !== 'function') process.exit(3);  // TS 7+: no JS API
const kind = file.toLowerCase().endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, kind);
const diags = src.parseDiagnostics || [];
if (!diags.length) process.exit(0);
const d = diags[0];
const p = src.getLineAndCharacterOfPosition(d.start || 0);
console.error(`${p.line + 1}:${p.character + 1}: TypeScript syntax error: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
process.exit(1);
"""


def check_ts(path, project_dir=None):
    node = shutil.which("node")
    if not node:
        return None
    env = dict(os.environ, ORIA_FILE=os.path.abspath(path))
    r = _run([node, "-e", _TS_SCRIPT], cwd=project_dir or os.path.dirname(os.path.abspath(path)), env=env)
    if r.returncode == 1:
        return f"{path}:{_first_line(r.stderr, '?')}"
    if r.returncode == 3:
        return _check_ts_with_tsc(path)
    return None


def _find_local_tsc(path):
    names = ("tsc.cmd", "tsc.exe", "tsc") if IS_WINDOWS else ("tsc",)
    d = Path(path).resolve().parent
    for folder in (d, *d.parents):
        for name in names:
            candidate = folder / "node_modules" / ".bin" / name
            if candidate.is_file():
                return str(candidate)
    return None


def _check_ts_with_tsc(path):
    """TypeScript 7+ (native compiler): run the project's tsc and keep only
    TS1xxx diagnostics, which are the syntax errors. Type errors are TS2xxx+."""
    tsc = _find_local_tsc(path)
    if not tsc:
        return None
    r = _run([
        tsc, "--noEmit", "--pretty", "false", "--noResolve", "--skipLibCheck",
        "--jsx", "preserve", "--types", "", "--ignoreConfig", os.path.abspath(path),
    ], cwd=os.path.dirname(os.path.abspath(path)))
    for line in (r.stdout + "\n" + r.stderr).splitlines():
        m = re.search(r"\((\d+),(\d+)\): error (TS1\d{3}): (.*)", line)
        if m:
            return f"{path}:{m.group(1)}:{m.group(2)}: TypeScript syntax error: {m.group(4).strip()} ({m.group(3)})"
    return None


def find_bash():
    bash = shutil.which("bash")
    if not bash:
        return None
    if IS_WINDOWS:
        # C:\Windows\System32\bash.exe is the WSL launcher: it expects Linux
        # paths and would report bogus errors. Only trust Git Bash.
        low = bash.lower()
        if "system32" in low or "windowsapps" in low:
            git = shutil.which("git")
            if git:
                candidate = Path(git).resolve().parent.parent / "bin" / "bash.exe"
                if candidate.is_file():
                    return str(candidate)
            return None
    return bash


def check_sh(path):
    bash = find_bash()
    if not bash:
        return None
    r = _run([bash, "-n", path])
    if r.returncode != 0:
        return f"{path}: shell syntax error: {_first_line(r.stderr, 'bash -n failed')}"
    return None


def find_powershell():
    return shutil.which("pwsh") or (shutil.which("powershell") if IS_WINDOWS else None)


_PS_SCRIPT = (
    "$e=$null;$t=$null;"
    "[void][System.Management.Automation.Language.Parser]::ParseFile($env:ORIA_FILE,[ref]$t,[ref]$e);"
    "if($e){$x=$e[0];[Console]::Error.WriteLine(\"$($x.Extent.StartLineNumber):$($x.Extent.StartColumnNumber): $($x.Message)\");exit 1}"
)


def check_ps1(path):
    ps = find_powershell()
    if not ps:
        return None
    env = dict(os.environ, ORIA_FILE=os.path.abspath(path))
    r = _run([ps, "-NoProfile", "-NonInteractive", "-Command", _PS_SCRIPT], env=env)
    if r.returncode == 1:
        return f"{path}:{_first_line(r.stderr, '?')}"
    return None


CHECKERS = {
    ".py": check_python,
    ".pyw": check_python,
    ".json": check_json,
    ".jsonc": check_json,
    ".yaml": check_yaml,
    ".yml": check_yaml,
    ".js": check_js,
    ".mjs": check_js,
    ".cjs": check_js,
    ".ts": check_ts,
    ".tsx": check_ts,
    ".mts": check_ts,
    ".cts": check_ts,
    ".sh": check_sh,
    ".bash": check_sh,
    ".ps1": check_ps1,
    ".psm1": check_ps1,
}


def check_file(path, project_dir=None):
    """Return an error string, or None if the file is fine or unsupported."""
    if not path or not os.path.isfile(path):
        return None
    checker = CHECKERS.get(Path(path).suffix.lower())
    if checker is None:
        return None
    try:
        if checker is check_ts:
            return check_ts(path, project_dir)
        return checker(path)
    except subprocess.TimeoutExpired:
        return None  # a slow tool is not a syntax error
    except OSError:
        return None


if __name__ == "__main__":  # pragma: no cover - manual debugging helper
    for p in sys.argv[1:]:
        print(p, "->", check_file(p) or "ok")
