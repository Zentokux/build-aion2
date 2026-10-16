"""Undo a Claude session: put the repo back as it was when the session started.

Usage (from the project root):
  python3 .claude/oria/restore.py            # restore the last session backup
  python3 .claude/oria/restore.py --list     # list available backups
  python3 .claude/oria/restore.py --ref REF  # restore a specific backup
  add --yes to skip the confirmation
On Windows use `py` instead of `python3`.
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import backup  # noqa: E402
import common  # noqa: E402


def main():
    common.setup_stdio()
    ap = argparse.ArgumentParser(description="Restore a session backup")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--ref")
    ap.add_argument("--yes", action="store_true")
    a = ap.parse_args()

    repo = backup.repo_root(os.getcwd())
    if repo is None:
        print("✗ no estás dentro de un repo git")
        return 1

    # Windows cannot delete the folder a process is standing in, and the
    # restore may remove the current subfolder.
    os.chdir(repo)
    refs = backup.list_backups(repo)
    if a.list:
        if not refs:
            print("(no hay backups)")
        for r in refs:
            msg = backup.git(repo, "log", "-1", "--format=%s", r).stdout.strip()
            print(f"  {r[len(backup.REF_PREFIX):]:40} {msg}")
        return 0

    ref = a.ref or backup.load_state(repo).get("ref")
    if ref and not ref.startswith("refs/"):
        ref = backup.REF_PREFIX + ref
    if not ref or ref not in refs:
        print("✗ no encuentro ese backup. Usa --list para ver los disponibles.")
        return 1

    print(f"Se restaurará el estado de: {ref[len(backup.REF_PREFIX):]}")
    print("Esto deshace commits y cambios hechos después de ese momento.")
    print("(antes se guarda un backup del estado actual, así que también se puede deshacer)")
    if not a.yes:
        if input("¿Continuar? [y/N] ").strip().lower() not in ("y", "s", "si", "sí", "yes"):
            print("cancelado")
            return 1
    safety = backup.restore(repo, ref)
    print("✓ restaurado")
    if safety:
        print(f"  para deshacer esta restauración: {common.python_hint()} .claude/oria/restore.py "
              f"--ref {safety[len(backup.REF_PREFIX):]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
