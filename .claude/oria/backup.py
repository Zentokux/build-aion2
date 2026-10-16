"""Session backups stored as private git refs.

A backup is a commit whose parent is HEAD at session start and whose tree is
the full working tree at that moment (tracked + untracked, minus ignored).
It is built with a temporary index, so the user's working tree, index and
stash are never touched. Refs live under refs/oria/backups/ and are not
pushed by `git push` or `git push --tags`.
"""

import json
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from common import run

REF_PREFIX = "refs/oria/backups/"
KEEP = 10
STATE_FILE = Path(".claude") / "oria-state.json"
HEAVY_FILE = 50 * 1024 * 1024  # a backed-up file this big is reported to the user
HEAVY_TOTAL = 200 * 1024 * 1024


class GitError(Exception):
    pass


def git(repo, *args, env=None, check=True, timeout=120, input_text=None):
    r = run(["git", *args], cwd=repo, env=env, timeout=timeout, input_text=input_text)
    if check and r.returncode != 0:
        raise GitError(f"git {' '.join(args)}: {r.stderr.strip() or r.stdout.strip()}")
    return r


def repo_root(path):
    r = run(["git", "rev-parse", "--show-toplevel"], cwd=path, timeout=30)
    if r.returncode != 0:
        return None
    return os.path.normpath(r.stdout.strip())


def head(repo):
    r = git(repo, "rev-parse", "--verify", "-q", "HEAD", check=False)
    return r.stdout.strip() if r.returncode == 0 else None


def _identity_env(extra=None):
    env = dict(os.environ)
    # commit-tree needs an identity even if the user never configured one;
    # these commits are local-only snapshots.
    env.setdefault("GIT_AUTHOR_NAME", "oria-backup")
    env.setdefault("GIT_AUTHOR_EMAIL", "oria-backup@localhost")
    env.setdefault("GIT_COMMITTER_NAME", "oria-backup")
    env.setdefault("GIT_COMMITTER_EMAIL", "oria-backup@localhost")
    if extra:
        env.update(extra)
    return env


def _real_index(repo):
    r = git(repo, "rev-parse", "--git-path", "index", check=False)
    p = r.stdout.strip()
    if r.returncode != 0 or not p:
        return None
    p = Path(p) if os.path.isabs(p) else Path(repo) / p
    return p if p.is_file() else None


def snapshot_tree(repo, base):
    """Write a tree object of the current working tree without touching the real index.

    The temporary index starts as a copy of the real one, so git reuses its
    file-stat cache and only re-reads files that changed: the cost follows
    the size of the change, not of the project. Every file is still
    included. If the copy cannot be used, it falls back to reading HEAD's
    tree (same result, it just re-reads every file).
    """
    tmp = tempfile.mkdtemp(prefix="oria-index-")
    idx = os.path.join(tmp, "index")
    env = _identity_env({"GIT_INDEX_FILE": idx})
    try:
        real = _real_index(repo)
        if real:
            try:
                shutil.copy2(real, idx)  # copy2 keeps the mtime git's racy-file check relies on
                git(repo, "add", "-A", "--", ".", env=env, timeout=600)
                return git(repo, "write-tree", env=env).stdout.strip()
            except (OSError, GitError):
                for name in os.listdir(tmp):
                    os.unlink(os.path.join(tmp, name))
        if base:
            git(repo, "read-tree", base, env=env)
        git(repo, "add", "-A", "--", ".", env=env, timeout=600)
        return git(repo, "write-tree", env=env).stdout.strip()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def _state_path(repo):
    return Path(repo) / STATE_FILE


def save_state(repo, ref):
    p = _state_path(repo)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps({"ref": ref, "created": int(time.time())}), encoding="utf-8")


def load_state(repo):
    try:
        return json.loads(_state_path(repo).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def clear_state(repo):
    """Forget the previous session's backup before making the new one.

    If the new backup then fails (or the hook is killed), restore.py finds no
    backup instead of silently going back to an older session.
    """
    try:
        _state_path(repo).unlink()
    except OSError:
        pass


def list_backups(repo):
    r = git(repo, "for-each-ref", "--sort=-refname", "--format=%(refname)", REF_PREFIX, check=False)
    return [l for l in r.stdout.splitlines() if l.strip()]


def rotate(repo, keep=KEEP):
    for ref in list_backups(repo)[keep:]:
        git(repo, "update-ref", "-d", ref, check=False)


def create(repo, label="session", remember=True):
    """Create a backup. Returns (ref, message). ref is None when skipped."""
    base = head(repo)
    if base is None:
        return None, "repo has no commits yet — backup skipped (make a first commit to enable it)"
    tree = snapshot_tree(repo, base)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    commit = git(repo, "commit-tree", tree, "-p", base, "-m", f"oria {label} backup {stamp}",
                 env=_identity_env()).stdout.strip()
    ref = f"{REF_PREFIX}{stamp}-{label}"
    n = 1
    while git(repo, "rev-parse", "--verify", "-q", ref, check=False).returncode == 0:
        n += 1
        ref = f"{REF_PREFIX}{stamp}-{label}-{n}"
    git(repo, "update-ref", ref, commit)
    if remember:
        save_state(repo, ref)
    rotate(repo)
    collect_garbage(repo)
    dirty = git(repo, "rev-parse", f"{base}^{{tree}}").stdout.strip() != tree
    msg = "backup created" + (" (includes uncommitted changes)" if dirty else "")
    heavy = heavy_files(repo, base, tree)
    if heavy:
        msg += "\n" + heavy
    return ref, msg


def collect_garbage(repo):
    """Let git reclaim objects only rotated-out backups used.

    `gc --auto` does nothing unless the repo needs it, runs in the background
    by default, and keeps git's safety delay before deleting anything.
    """
    try:
        git(repo, "gc", "--auto", "--quiet", check=False, timeout=60)
    except (OSError, subprocess.TimeoutExpired):
        pass


def _fmt_mb(n):
    return f"{n / (1024 * 1024):.0f} MB"


def heavy_files(repo, base, tree):
    """Warning text when the backup holds big uncommitted files, else ''.

    They are backed up like everything else; the user is only told, because
    each session keeps a copy of them inside .git.
    """
    r = git(repo, "diff-tree", "-r", "--no-renames", "--diff-filter=AM", base, tree, check=False)
    entries = []
    for line in r.stdout.splitlines():
        meta, _, path = line.partition("\t")
        parts = meta.split()
        if len(parts) >= 4 and path:
            entries.append((parts[3], path))
    if not entries:
        return ""
    sizes = git(repo, "cat-file", "--batch-check=%(objectsize)", check=False,
                input_text="\n".join(sha for sha, _ in entries) + "\n").stdout.split()
    files = [(int(s), p) for s, (_, p) in zip(sizes, entries) if s.isdigit()]
    total = sum(s for s, _ in files)
    big = sorted((f for f in files if f[0] >= HEAVY_FILE), reverse=True)
    if not big and total < HEAVY_TOTAL:
        return ""
    lines = [f"⚠ the backup includes {_fmt_mb(total)} of uncommitted files "
             "(all backed up; each session keeps a copy in .git):"]
    lines += [f"  {_fmt_mb(s)}  {p}" for s, p in big[:5]]
    if len(big) > 5:
        lines.append(f"  ... and {len(big) - 5} more")
    return "\n".join(lines)


def changed_files(repo, before, after):
    """Absolute paths of files that differ between two trees."""
    r = git(repo, "diff", "--name-only", "--no-renames", before, after, check=False)
    return [os.path.join(repo, p) for p in r.stdout.splitlines() if p.strip()]


def current_tree(repo):
    """Tree id of the working tree right now (identical content = identical id)."""
    return snapshot_tree(repo, head(repo))


def summary(repo, after=None):
    """Changes since the session backup, or None if there is no backup / no change.

    `after` is the current tree id when the caller already computed it.
    """
    ref = load_state(repo).get("ref")
    if not ref or git(repo, "rev-parse", "--verify", "-q", ref, check=False).returncode != 0:
        return None
    base = git(repo, "rev-parse", f"{ref}^").stdout.strip()
    before = git(repo, "rev-parse", f"{ref}^{{tree}}").stdout.strip()
    after = after or current_tree(repo)
    commits = git(repo, "log", "--oneline", f"{base}..HEAD", check=False).stdout.strip()
    files = git(repo, "diff", "--name-status", before, after, check=False).stdout.strip()
    if not commits and not files:
        return None
    return {"ref": ref, "commits": commits.splitlines(), "files": files.splitlines()}


def restore(repo, ref):
    """Put the repo back exactly as it was when `ref` was taken.

    A safety backup of the current state is made first, so a restore can be undone.
    Uncommitted pre-session work comes back as uncommitted changes.
    """
    safety, _ = create(repo, label="pre-restore", remember=False)
    base = git(repo, "rev-parse", f"{ref}^").stdout.strip()
    git(repo, "reset", "-q", "--hard", base)
    git(repo, "clean", "-q", "-fd")
    deleted = git(repo, "diff", "--name-only", "--no-renames", "--diff-filter=D", base, ref).stdout.splitlines()
    if git(repo, "diff", "--quiet", base, ref, check=False).returncode != 0:
        git(repo, "checkout", ref, "--", ".")
        for rel in deleted:
            try:
                (Path(repo) / rel).unlink()
            except OSError:
                pass
        git(repo, "reset", "-q")  # leave pre-session work unstaged, HEAD at base
    return safety
