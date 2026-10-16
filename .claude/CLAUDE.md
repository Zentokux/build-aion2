<!-- oria:start — managed by optimo-razonamiento-ia; overwritten on reinstall -->
# Rules
- Hooks check syntax after each edit and run the project validator (after edits, or at the end if it is slow). Fix any reported error before anything else.
- Not done until validation passes and the change was exercised (run/test/reproduce). Bugs: reproduce, fix, re-check.
- A fix that applies in several places goes in all of them.
- Commits/PRs: no AI attribution or mentions; never change the repo's git identity. One logical change per commit.
- `.claude/oria/`, `.claude/CLAUDE.md` and `.claude/oria.json` are versioned. Never commit machine-specific files: `settings.local.json`, `oria-state.json`, `oria-cache.json`, `*.bak-oria`.
<!-- oria:end -->
