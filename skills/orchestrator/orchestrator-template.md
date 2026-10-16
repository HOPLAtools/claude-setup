# Orchestrator — <Project name>

> Read by `/hopla:orchestrator` at start-up. Only what is specific to this project goes here; the generic orchestrator rules live in the skill. Keep it short and current.

## Repos

| Repo | Path | Integration branch | Merge into integration |
|---|---|---|---|
| <name> | `<absolute path>` | `dev` | PR + orchestrator merges with `--no-ff` |

## Work list

- Path: `<plans-dir>/<YYYY-MM-DD>-work-list.md` — the ONLY list. Update its *In flight* section when a worker starts or lands, and tick an item in the same commit that lands the work.
- Suggested order / priorities: <e.g. "money items first; D3 and D5 last">

## Workers

- Worktree base: `origin/<integration>`
- Validation the worker reports: <e.g. `npm run typecheck` · `npm run lint` · `npm test` · `npm run format:check`>
- Extra rigor by type: <e.g. "money items: code review per phase + fresh-context branch review before the PR; production data fixes reviewed before they run and logged in `scripts/db/fixes/APPLIED.md`">
- Model overrides: <none, or "PhoneTest UI always on the strongest model">

## Release and deploy

- Integration → production: <e.g. "`dev` → `release/prod` → PR to `main`; the user merges `main`">
- Deploys: <e.g. "CI deploys `dev` and `main`; never deploy by hand">
- Migrations: <e.g. "`npm run db:migrate:remote:dev` before merging a migration to dev; production migrations are run by the user">
- Checks before a release: <e.g. "list new migrations; grep for a flag that must stay off in production">

## Approvals

| Action | Who approves |
|---|---|
| Merge a worker into `<integration>` | orchestrator, after CI + Level 5 |
| Production release / `main` | <user> |
| Production data, remote migrations | <user> |
| Product decisions | <user> (<other people, e.g. "Robert for pricing">) |

## Project-only rules

- <Rules learned in this project that do not apply elsewhere, with their why.>
