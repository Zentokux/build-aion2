"""SessionStart hook: back up the repo when a new session starts.

Only runs for source == "startup". Resume, /clear and /compact keep the
original backup, so the end-of-session summary covers the whole session.
"""

import common
import backup


def main():
    payload = common.read_payload()
    if payload.get("source", "startup") != "startup":
        return
    proj = common.project_dir(payload)
    repo = backup.repo_root(proj)
    if repo is None:
        common.emit({"systemMessage": "[oria] not a git repo — session backup skipped"})
        return
    common.update_cache(proj, session_files=[])
    backup.clear_state(repo)
    try:
        ref, msg = backup.create(repo)
    except (backup.GitError, OSError) as e:
        common.emit({"systemMessage": f"[oria] ⚠ session backup NOT created — restore.py cannot undo "
                                      f"this session: {e}"})
        return
    # Only the user sees this (systemMessage costs no tokens). The working
    # rules for Claude already live in .claude/CLAUDE.md, so no extra context.
    if ref:
        msg += f" — undo the whole session with: {common.python_hint()} .claude/oria/restore.py"
    common.emit({"systemMessage": f"[oria] {msg}"})


if __name__ == "__main__":
    common.main_guard(main)
