"""PostToolUse hook (Edit / Write / MultiEdit / NotebookEdit).

1. Syntax-checks the edited file (fast, always).
2. In project scope, runs the project's own validator (validate.py / .ps1 / .sh),
   unless it is slow ("auto" mode), the file is outside the project, or the
   file is inside .claude/. Slow validators still run when Claude finishes.
Errors are sent to Claude with decision=block so it fixes them right away
(the edit itself is already applied; "block" only feeds the reason back).
A validator failure identical to the previous one is sent as a one-line
reminder instead of the full output, to save tokens.
The validator gets ORIA_PHASE=edit and the files Claude edited this session
in ORIA_CHANGED_FILES, and only the time left before Claude Code's hook
timeout; if it does not finish, the user is told (never a silent cut).

Usage: post_edit.py --scope project|global
"""

import os
import sys
import time

import common
from checkers import check_file


def should_run_validator(proj, path):
    if path:
        try:
            rel = os.path.relpath(os.path.abspath(path), proj).replace("\\", "/")
        except ValueError:  # Windows: different drive, so outside the project
            return False
        if rel.startswith("../") or rel.startswith(".claude/"):
            return False
    cfg = common.load_config(proj)
    mode = cfg.get("validator_on_edit", "auto")
    if mode == "never":
        return False
    if mode == "always":
        return True
    seconds = common.load_cache(proj).get("validator_seconds")
    return seconds is None or seconds <= float(cfg.get("slow_seconds", 3))


def remember_edit(proj, path):
    """Files Claude edited this session (reset at session start), for the validator."""
    files = list(common.load_cache(proj).get("session_files") or [])
    if path:
        path = os.path.abspath(path)
        if path not in files:
            files.append(path)
            common.update_cache(proj, session_files=files)
    return files


def validator_problem(proj, changed, started):
    """Returns (text for Claude or None, note for the user or None)."""
    budget = common.validator_budget(proj, common.load_config(proj), "post_edit.py", started)
    ok, name, output = common.run_validator(proj, timeout=budget, phase="edit", changed=changed)
    if ok is None:  # too slow: not a code error; "auto" mode moves it to Stop from now on
        return None, f"[oria] {output} — it will run when Claude finishes instead"
    if ok:
        common.update_cache(proj, last_failure=None)
        return None, None
    fp = common.fingerprint(output)
    if common.load_cache(proj).get("last_failure") == fp:
        return f"{name} still fails with the same output as before (run it to see it again).", None
    common.update_cache(proj, last_failure=fp)
    return f"Project validator {name} failed:\n{output}", None


def main():
    started = time.monotonic()
    scope = "global" if "global" in sys.argv[1:] else "project"
    payload = common.read_payload()
    proj = common.project_dir(payload)
    if scope == "global" and common.has_project_install(proj):
        return  # the project hook already does this; avoid double reports

    ti = payload.get("tool_input") or {}
    path = ti.get("file_path") or ti.get("notebook_path")
    problems = []

    err = check_file(path, proj)
    if err:
        problems.append(f"Syntax error introduced by this edit:\n{err}")

    note = None
    if scope == "project":
        changed = remember_edit(proj, path)
        if should_run_validator(proj, path):
            problem, note = validator_problem(proj, changed, started)
            if problem:
                problems.append(problem)

    if not problems:
        if note:
            common.emit({"systemMessage": note})
        return
    reason = "\n\n".join(problems) + "\nFix this before continuing."
    short = err.splitlines()[0] if err else "project validator failed"
    common.emit({
        "decision": "block",
        "reason": reason,
        "systemMessage": f"[oria] {short}",
    })


if __name__ == "__main__":
    common.main_guard(main)
