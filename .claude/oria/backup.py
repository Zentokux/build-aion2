"""Session backups stored as private git refs.

A backup is a commit whose parent is HEAD at session start and whose tree is
the full working tree at that moment (tracked + untracked, minus ignored).
It is built with a temporary index, so the user's working tree, index and
stash are never touched. Refs live under refs/oria/backups/ and are not
pushed by `git push` or `git push --tags`.
"""

import json
import os
import tempfile
import time
from pathlib import Path

from common import run

REF_PREFIX = "refs/oria/backups/"
KEEP = 10
STATE_FILE = Path(".claude") / "oria-state.json"


class GitError(Exception):
    pass


def git(repo, *args, env=None, check=True, timeout=120):
    r = run(["git", *args], cwd=repo, env=env, timeout=timeout)
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


def snapshot_tree(repo, base):
    """Write a tree object of the current working tree without touching the real index."""
    fd, idx = tempfile.mkstemp(prefix="oria-index-")
    os.close(fd)
    os.unlink(idx)  # git creates it
    env = _identity_env({"GIT_INDEX_FILE": idx})
    try:
        if base:
            git(repo, "read-tree", base, env=env)
        git(repo, "add", "-A", "--", ".", env=env, timeout=600)
        return git(repo, "write-tree", env=env).stdout.strip()
    finally:
        try:
            os.unlink(idx)
        except OSError:
            pass


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
    dirty = git(repo, "rev-parse", f"{base}^{{tree}}").stdout.strip() != tree
    return ref, ("backup created" + (" (includes uncommitted changes)" if dirty else ""))


def summary(repo):
    """Changes since the session backup, or None if there is no backup / no change."""
    ref = load_state(repo).get("ref")
    if not ref or git(repo, "rev-parse", "--verify", "-q", ref, check=False).returncode != 0:
        return None
    base = git(repo, "rev-parse", f"{ref}^").stdout.strip()
    before = git(repo, "rev-parse", f"{ref}^{{tree}}").stdout.strip()
    now_head = head(repo)
    after = snapshot_tree(repo, now_head)
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
