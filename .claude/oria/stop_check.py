"""Stop hook: final validation + visible summary of the session's changes.

While the project validator fails, Claude is sent back to work as long as it
is making progress (the failure output changes between rounds). It is allowed
to stop only when it is stuck (identical failure twice in a row) or after
MAX_ROUNDS, and then the user is warned. Big failures get fixed batch by
batch; a failure Claude cannot fix never loops forever.
The validator always checks everything here (ORIA_PHASE=stop) and gets the
time left before Claude Code's hook timeout; if it cannot finish, the user
is told the changes are unvalidated.
"""

import time

import common
import backup

MAX_FILES = 15
MAX_ROUNDS = 8


def format_summary(s, py):
    lines = ["── cambios de esta sesión ──"]
    if s["commits"]:
        lines.append(f"commits nuevos: {len(s['commits'])}")
        lines += [f"  {c}" for c in s["commits"][:MAX_FILES]]
    if s["files"]:
        lines.append(f"archivos: {len(s['files'])}")
        lines += [f"  {f}" for f in s["files"][:MAX_FILES]]
        if len(s["files"]) > MAX_FILES:
            lines.append(f"  ... y {len(s['files']) - MAX_FILES} más")
    lines.append(f"REVERTIR toda la sesión: {py} .claude/oria/restore.py")
    return "\n".join(lines)


def tree_of(repo):
    if not repo:
        return None
    try:
        return backup.current_tree(repo)
    except backup.GitError:
        return None


def session_changes(repo, proj, tree):
    """Files changed since the session backup (any tool, not only edits)."""
    ref = backup.load_state(repo).get("ref") if repo else None
    if ref and tree:
        try:
            before = backup.git(repo, "rev-parse", f"{ref}^{{tree}}").stdout.strip()
            return backup.changed_files(repo, before, tree)
        except backup.GitError:
            pass
    return list(common.load_cache(proj).get("session_files") or [])


def main():
    started = time.monotonic()
    payload = common.read_payload()
    proj = common.project_dir(payload)
    repo = backup.repo_root(proj)
    tree = tree_of(repo)

    if tree and common.load_cache(proj).get("last_pass_tree") == tree:
        # nothing changed since the validator last passed (e.g. a text-only
        # answer): skip it, it would give the same result
        ok, name, output = True, None, ""
    else:
        budget = common.validator_budget(proj, common.load_config(proj), "stop_check.py", started)
        ok, name, output = common.run_validator(
            proj, timeout=budget, phase="stop", changed=session_changes(repo, proj, tree))
        common.update_cache(proj, last_pass_tree=tree if ok else None)
    messages = []

    if ok is None:
        # out of time: not a code error Claude can fix, but never a silent pass
        messages.append(f"[oria] ⚠ VALIDACIÓN NO TERMINADA: {output}. Los cambios de esta sesión "
                        "no están validados. Sube \"validator_timeout\" en .claude/oria.json y vuelve "
                        "a correr install.py para ampliar el límite.")
    elif ok:
        common.update_cache(proj, stop_rounds=0, last_stop_failure=None)
    else:
        cache = common.load_cache(proj)
        continuing = bool(payload.get("stop_hook_active"))
        rounds = cache.get("stop_rounds", 0) if continuing else 0
        fp = common.fingerprint(output)
        stuck = continuing and cache.get("last_stop_failure") == fp
        if not stuck and rounds < MAX_ROUNDS:
            common.update_cache(proj, stop_rounds=rounds + 1, last_stop_failure=fp)
            common.emit({
                "decision": "block",
                "reason": f"Project validator {name} fails (round {rounds + 1}/{MAX_ROUNDS}). "
                          f"Fix it before finishing:\n{output}",
                "systemMessage": f"[oria] {name} falla — Claude sigue arreglándolo (ronda {rounds + 1})",
            })
            return
        why = "sin progreso (mismo error dos veces)" if stuck else f"tras {MAX_ROUNDS} rondas"
        messages.append(f"[oria] ⚠ {name} sigue fallando {why} — revisa antes de aceptar los cambios:\n{output}")
        common.update_cache(proj, stop_rounds=0, last_stop_failure=None)

    if repo:
        s = backup.summary(repo, after=tree)
        if s:
            messages.append(format_summary(s, common.python_hint()))
    if messages:
        common.emit({"systemMessage": "\n\n".join(messages)})


if __name__ == "__main__":
    common.main_guard(main)
