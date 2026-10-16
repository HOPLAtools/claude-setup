# Orchestrator — @hopla/claude-setup

> Read by `/hopla:orchestrator` at start-up. Only what is specific to this project goes here; the generic orchestrator rules live in the skill. Keep it short and current.

## Repos

| Repo | Path | Integration branch | Merge into integration |
|---|---|---|---|
| claude-setup | `/Users/juliochemoreno/Projects/hopla/claude-setup` | `main` (no `dev`) | PR with CI green; Julio merges |

## Work list

- Path: `.agents/work-list.md` — the ONLY list. It is tracked (`.agents/plans/` is git-ignored in this repo), so workers see it from their worktree. Update its *In flight* section when a worker starts or lands, and tick an item in the same commit that lands the work.
- Suggested order / priorities: none yet.

## Workers

- Worktree base: `origin/main`
- Validation the worker reports: `npm test` · `node scripts/check-versions.js`; plus `bash scripts/pack-smoke.sh` if it touches `cli.js`; `bash skills/hook-audit/tests/manual-test.sh` if it touches hook-audit; the code-review dogfood (AGENTS.md §5) if it touches code-review
- Extra rigor by type: changes to `skills/`, `agents/`, `hooks/`, `global-rules.md` reach every user — follow AGENTS.md §4 (hook tests, differential check for guard changes)
- Model overrides: `hooks/`, `guard/` and `cli.js` always on the strongest model

## Release and deploy

- Integration → production: `main` is both; a release is a PR to `main` with the version bump (AGENTS.md §6)
- Deploys: merging a version bump to `main` publishes to npm automatically (`publish.yml`); the plugin channel reads the git repo
- Migrations: none
- Checks before a release: versions match in `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`; CI green; confirm on the registry after publish

## Approvals

| Action | Who approves |
|---|---|
| Worker opens a PR to `main` | no approval needed |
| Merge any PR into `main` | Julio |
| Version bump / release | Julio |
| Changes to `AGENTS.md` / `.claude/CLAUDE.md` | Julio, in the orchestrator session |
| Product decisions | Julio |

## Project-only rules

- The version bump goes only in the release PR, never in a worker branch. *Why: two parallel workers bumping the same three files conflict, and a merged bump publishes to npm.*
- `hooks/`, `guard/` and `cli.js` always run on the strongest model. *Why: they run on every user's machine and guard/hook bypasses were the high-severity findings in 3.4.0 and 4.1.0.*
