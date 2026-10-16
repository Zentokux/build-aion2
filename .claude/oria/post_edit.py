"""PostToolUse hook (Edit / Write / MultiEdit / NotebookEdit).

1. Syntax-checks the edited file (fast, always).
2. In project scope, runs the project's own validator (validate.py / .ps1 / .sh),
   unless it is slow ("auto" mode), the file is outside the project, or the
   file is inside .claude/. Slow validators still run when Claude finishes.
Errors are sent to Claude with decision=block so it fixes them right away
(the edit itself is already applied; "block" only feeds the reason back).
A validator failure identical to the previous one is sent as a one-line
reminder instead of the full output, to save tokens.

Usage: post_edit.py --scope project|global
"""

import os
import sys

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


def validator_problem(proj):
    ok, name, output = common.run_validator(proj)
    if ok:
        common.update_cache(proj, last_failure=None)
        return None
    fp = common.fingerprint(output)
    if common.load_cache(proj).get("last_failure") == fp:
        return f"{name} still fails with the same output as before (run it to see it again)."
    common.update_cache(proj, last_failure=fp)
    return f"Project validator {name} failed:\n{output}"


def main():
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

    if scope == "project" and should_run_validator(proj, path):
        problem = validator_problem(proj)
        if problem:
            problems.append(problem)

    if not problems:
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
