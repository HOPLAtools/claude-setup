# Changelog

All notable changes to **@hopla/claude-setup** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- **`/hopla:plan-feature`** (from the 3.2.0 system review): spikes of agents or workflows that write files check where they write, not only that they write; each task's Validate is task-scoped and the whole suite runs once at the end (independent tasks may run in parallel).

## [3.2.0] - 2026-10-02

`/hopla:execute` runs independent tasks as a native Workflow. No breaking changes.

Plugin users without auto-update refresh with `/plugin marketplace update hopla-marketplace` → `/plugin disable hopla@hopla-marketplace` → `/plugin enable hopla@hopla-marketplace` → `/reload-plugins`.

### Added
- **Workflows in `/hopla:execute`** (new Step 4a): when a plan has 3 or more independent tasks (disjoint `File` fields, no cross-references, no deletes, CHANGELOG/version/CI/deploy/migrations/DNS excluded), they run as a native Workflow — up to 6 agents, each task implemented and then verified with its own Validate command (verify on Sonnet at low effort) — after you approve the workflow dialog. The validation pyramid stays in the main session. Declined dialog, Fable session or no Workflow tool → sequential, as before. Workflow agents never commit.
- **`effort: high`** on `plan-feature`, `debug` and `rca`. Measured on Claude Code 2.1.287: it applies to the skill's turn and keeps the prompt cache.

### Changed
- The `subagent-execution` deprecation notice now points to `/hopla:execute`.

### Fixed
- `code-review` takes the native review's findings from `ReportFindings` when the host provides it, and from its text otherwise (the interactive check had no `ReportFindings`).

## [3.1.1] - 2026-10-02

Fixes and process improvements after 3.1.0. No breaking changes.

Plugin users without auto-update refresh with `/plugin marketplace update hopla-marketplace` → `/plugin disable hopla@hopla-marketplace` → `/plugin enable hopla@hopla-marketplace` → `/reload-plugins`.

### Fixed
- `code-review` and the `write-skill` guide no longer write the ARGUMENTS placeholder in prose: Claude Code substituted it there, so the skill read "Arguments (``, …)".

### Changed
- **`/hopla:plan-feature`** (from the 3.1.0 system review): the dependents search also covers docs that describe a changed file by name (SECURITY.md, README tables, CLAUDE.md tree); a spike that proves a negative ("X does not restrict") must also prove the positive side the plan relies on; spikes run in the plan's real shape (permission mode, files outside the project, work already committed).

## [3.1.0] - 2026-10-02

`code-review` now wraps Claude Code's native `/code-review`. No breaking changes.

Plugin users without auto-update refresh with `/plugin marketplace update hopla-marketplace` → `/plugin disable hopla@hopla-marketplace` → `/plugin enable hopla@hopla-marketplace` → `/reload-plugins`.

### Changed
- **`/hopla:code-review [effort] [--fix] [target]` wraps the native `/code-review`.** It runs the native review (default `medium`, never `low` when the project has a checklist), then a checklist pass the native review does not do (HOPLA's `checklist.md` + `.agents/guides/review-checklist.md`), dropping duplicates. Every finding gets a severity and a 0–100 confidence; only findings ≥ 80 are kept, the rest are listed as dropped. The report is always saved to `.agents/code-reviews/` with `source` and `confidence` per finding; with `--fix` the fixes are applied and each finding records its outcome. A target (branch, PR number or path) reviews committed work too; `/hopla:execute` passes the feature branch at Level 5 when phases were already committed (before, only the uncommitted diff was reviewed).
- **`code-review-fix`** (deprecated in 3.0.0) now points to `/hopla:code-review --fix`.
- **Guides are manual-only** (`disable-model-invocation`): they no longer take space in the skill listing, where 7 of 9 showed without a description. Use `/hopla:guides:<name>`; HOPLA skills keep reading them by path.
- **`/hopla:plan-feature`** (from the 3.0.0 system review): the dependents search also covers the old names of renamed or moved files, and phased plans list which test files land in each commit, so no commit carries a failing test.

### Added
- **`/hopla:review-plan` completeness check:** the summary flags plans without a dependents search (incl. old names), unproven platform claims, phased plans without tests per commit, and an open `[Unreleased]` the release does not fold in.

### Security
- `tsc-check` writes its per-session record through an exclusive temp file with mode `0600`, never through a planted symlink.

## [3.0.0] - 2026-10-02

First release of the 3.x series: commands become skills and six items are deprecated. **Nothing is removed** — every `/hopla:<name>` and `/hopla:guides:<name>` keeps working with the same arguments. Deprecated items are removed in 4.0.0.

Plugin users without auto-update refresh with `/plugin marketplace update hopla-marketplace` → `/plugin disable hopla@hopla-marketplace` → `/plugin enable hopla@hopla-marketplace` → `/reload-plugins`.

### Changed
- **Commands are skills.** The 11 commands moved to `skills/<name>/SKILL.md` (archive, code-review-fix, create-prd, execute, guide, init-project, plan-feature, rca, review-plan, system-review, validate) and the 9 guides to `skills/guides-<name>/` with `name: guides:<name>`. Invocation names, named arguments, manual-only flags and forks are unchanged; guides also answer to `/hopla:guides-<name>`. The `commands/` directory is gone, so anything that read `commands/<name>.md` from the plugin must read `skills/<name>/SKILL.md`.
- Internal references point at `${CLAUDE_PLUGIN_ROOT}/skills/...`, so skills find the validation pyramid and other plugin files from any project.
- `code-review`, `execute`, `init-project` and `hopla-claude-setup status` no longer recommend `code-review-fix`.
- CI and the publish workflow run `claude plugin validate` (pinned Claude Code CLI, no auth).

### Deprecated
- `parallel-dispatch` and `subagent-execution` → native Workflows (say "use a workflow").
- `refactoring` → native `/simplify`.
- `code-review-fix` → native `/code-review --fix`.
- Agent `code-reviewer` → the `code-review` skill; agent `system-reviewer` → `/hopla:system-review`.

### Added
- **Deprecation notices** (`hooks/deprecation-notice.js`, replacing the silent `prompt-route.js`): the first time a deprecated skill or agent is used in a session — typed as `/hopla:<name>` or invoked by Claude — you and Claude see one line naming the replacement. It never blocks and never auto-approves the tool call.

### Fixed
- The `write-skill` guide no longer contains a literal positional placeholder, which Claude Code substituted when the guide was loaded.

## [2.4.1] - 2026-10-02

Process fixes from the 2.2 and 2.4 system reviews. No breaking changes.

### Changed
- **`/hopla:plan-feature` checks dependents and platform claims before writing tasks.** Two required Phase 3 steps, each with a Phase 6 checklist item: when a plan changes a selection, detection, path or naming rule, it searches for everything that relies on the old behavior (tests and fixtures included, plus any open `[Unreleased]` CHANGELOG section) and gives each a task; when a task relies on platform or tool behavior the codebase cannot prove, the plan runs the proving command first (outside bypass mode) or adds a Task 0 spike with a fallback. From the 2.2 and 2.4 system reviews (plans that missed a dependent or a platform constraint, 3 occurrences).

### Fixed
- **Code reviews are always saved to a file.** `/hopla:execute` Level 5 now passes only when `.agents/code-reviews/<plan-slug>.md` exists, even when the review finds nothing, so `/hopla:archive` and `hopla-claude-setup status` find it. The `hopla:code-reviewer` and `hopla:system-reviewer` agents are read-only (no Write tool) but were told to save their report, so it was lost; they now return it as their final message and the caller saves it. The validation pyramid and the `code-review` skill use the same path.

## [2.4.0] - 2026-10-02

Two follow-ups from 2.3, and the first release published automatically. No breaking changes.

### Changed
- **The `git` skill honors standing approvals.** Commit, push and PR creation still ask by default; when the user's instructions (a `CLAUDE.md` or a file in `~/.claude/rules/`) grant a standing approval for that exact action, the skill does it without asking and reports it (branch, commit, push, PR URL). Merging, tags, deleting branches or worktrees and commits or pushes on `main`/`master` still ask unless the approval names them. `global-rules.md` is unchanged.
- **Releases publish to npm automatically.** A new workflow (`.github/workflows/publish.yml`) publishes `@hopla/claude-setup` when a push to `main` carries a version that is not on npm yet, using npm trusted publishing (OIDC, no stored token) with provenance. It repeats the CI checks and runs `prepublishOnly` before uploading; any other push ends green doing nothing. CI now also runs on Node 24, the Node used to publish.

### Fixed
- **Active-plan fallback skips notes files.** Without a valid pointer, the newest plan by modification time now must have an `## Implementation Tasks` or `### Task` heading, so a notes or research file in the plans dir no longer shows up as "Active plan" on every session start (session-start context, pre-compact snapshot, statusline, `hopla-claude-setup status`).

## [2.3.0] - 2026-10-02

Follow-ups from the 2.2 review and the interactive checks. No breaking changes.

### Fixed
- **Session-start context replays the pre-compact snapshot only after `/compact` or on resume.** Before, it was replayed on every session start (startup, `/clear`, fork) for two hours, bringing back context the user had just cleared. With no payload (manual runs) the snapshot is still replayed.
- **`env-protect` covers `MultiEdit`**: the matcher now includes it, and `.dev.vars` is blocked for MultiEdit like Edit.
- **`tsc-check` no longer passes silently on a solution-style `tsconfig.json`**: when a tsconfig declares `references`, the hook asks TypeScript for the effective config (`tsc --showConfig`, so `extends` chains, npm bases and comments resolve exactly as in tsc). If it has references and no root files, the check is skipped with a one-line notice instead of running a check that covers nothing; if `--showConfig` fails, tsc runs as before.
- **`hopla-claude-setup status`** matches code reviews and execution reports to a plan by exact slug (`auth.md`, `auth-…`), so `oauth-refactor.md` no longer counts as the review of plan `auth`.

### Changed
- **Active-plan pointer**: no `updatedAt` field (the model had to invent it); the step is sanitized to one printable line of at most 80 chars before it reaches the context, statusline or `status`.
- Long context lines are clipped at a word boundary instead of mid-word.
- `/hopla:execute` checks that `.agents/hopla-active-plan.json` is git-ignored before the first write and asks to add it to `.gitignore` otherwise; `/hopla:plan-feature` skips the write in that case.

## [2.2.0] - 2026-10-01

No breaking changes: nothing is removed. Requires Claude Code ≥ 2.1.218 for the full fork behavior (`background: false`); older versions ignore the new frontmatter fields.

### Fixed
- **`/hopla:archive` now produces canonical specs.** It reads the plan's own `## Requirements Delta` (before, only the design spec's delta was read, so plans never reached `.agents/specs/canonical/`), follows `See spec: <path>`, merges by requirement ID without double counting, shows conflicts, warns (never rejects) on ADDED/MODIFIED without a scenario, and lists bullets without a `REQ-` ID as "unparsed" instead of dropping them. It also fixes the `claude-setup status` typo (the bin is `hopla-claude-setup`).
- **Command arguments.** Positional `$N` is 0-based in Claude Code, so `/hopla:system-review plan report` received them swapped. `system-review`, `archive`, `review-plan` and `execute` now declare `arguments: [...]` and use `$plan` / `$report`; `code-review-fix` takes the whole string via `$ARGUMENTS`.
- **`tsc-check` feedback and monorepos.** Type errors now reach Claude (exit 2 + stderr) and the check runs `tsc -p` on the nearest `tsconfig.json` of each edited file (walking up to the git root) instead of only `<session cwd>/tsconfig.json`.
- **Agents honor their `tools:` limits**, and SessionStart context is injected on `resume` and `fork` too.
- **`env-protect` false positives.** Bash commands that only mention a dotenv file — grep patterns, `echo .env >> .gitignore`, commit messages, comments, heredoc prose, `git add .env.example`, `--env-file .env` — are no longer blocked. Commands that read it (readers, `source`, redirects, grep/awk/sed on the file, copies out, git read subcommands, interpreters and shells, heredocs that open it) still are.

### Added
- **Plans directory declaration**: `## HOPLA` / `- Plans: docs/plans/` in `AGENTS.md` (fallback `CLAUDE.md`), default `.agents/plans/`. Honored by plan-feature, execute, archive, prime, brainstorm, the git skill, the hooks, the statusline and `hopla-claude-setup status`. Unsafe values are ignored with a warning.
- **`Owns:` line** under `## Requirements Delta`: a plan that references a shared spec lists the spec requirements it delivers; archive merges only those, lists the rest as skipped and does not move a spec another active plan still references.
- **Active-plan pointer** `.agents/hopla-active-plan.json` (plan, step, status), written by plan-feature and execute, read by session-prime, precompact-snapshot, the statusline and `status`, cleared by archive. After `/compact` the context names the plan and step and says to re-read it.
- **`status --json` keys**: `plans_dir`, `plans_dir_source`, `plans_dir_present`, `plans_dir_warning`, `active_plan` (additive).
- **`when_to_use`** on every skill and on plan-feature, rca, review-plan, validate and system-review.
- Tests: plans-dir/status/pointer cases, a parity test between `cli.js` and `hooks/lib/plans.js`, a frontmatter guard test, session-prime and precompact-snapshot suites, a table-driven env-protect suite.

### Changed
- **`tsc-check` runs once per turn.** On edits it only records the file; a new Stop hook runs tsc at the end of the turn, shows the first 30 errors in files edited this turn plus totals and a `/tmp` log path, and blocks at most twice per turn (never twice for the same errors). Errors in other files are counted in one line and never block. For per-edit diagnostics, install the official `typescript-lsp` plugin.
- **SessionStart context is minimal**: branch, uncommitted summary (5 sample lines), active plan + step and the compact-snapshot replay — about 1 K chars typical, hard cap 1,500 (was ~3.9 K). The skills list, the CLAUDE.md excerpt and recent commits are gone (Claude Code already loads CLAUDE.md and lists skills).
- **Prompt router is silent.** `prompt-route.js` no longer injects routing hints; it stays registered. `triggers:` is no longer used (removed from `code-review`).
- **Forks on cheaper models**: `prime` (Haiku, via `hopla:codebase-researcher`), `hook-audit` (Sonnet) and `system-review` (Sonnet) run as forked subagents with `background: false`. Every other skill and command inherits the session model. `codebase-researcher` runs on Haiku.
- **Manual-only commands**: `guide`, `create-prd`, `init-project`, `execute` and `archive` (`disable-model-invocation: true`) — Claude asks you to run them.
- **`env-protect`**: template files (`.env.example`, `.env.sample`, `.env.template`, …) are readable and editable with every tool; `.env.<x>.local`, case variants and the Grep tool's `glob` are now covered; `.dev.vars` is blocked for Read, Grep and Edit.
- Delta templates (plan-feature, brainstorm) include a scenario under MODIFIED (a MODIFIED entry is the full replacement body) and write `See spec:` / `Owns:` as plain lines.

### Upgrade
Plugin users with auto-update get 2.2.0 at the next session start. Otherwise:
```
/plugin marketplace update hopla-marketplace
/plugin disable hopla@hopla-marketplace
/plugin enable hopla@hopla-marketplace
/reload-plugins
```
Add `.agents/hopla-active-plan.json` and `.claude/compact-snapshot.json` to your project's `.gitignore`.

## [2.1.1] - 2026-05-12

### Fixed
- `hopla-claude-setup --migrate` and `--uninstall` now clean up legacy guide duplicates left in `~/.claude/commands/guides/` by pre-plugin CLI versions (≤ v1.11.x). Removes only files whose name matches a plugin-shipped guide — custom user guides in the same directory are preserved. Empty `guides/` directories are then removed.

### Notes
- This addresses the duplicate `/guides:*` entries (marked `(user)`) that appeared alongside `/hopla:guides:*` (marked `(hopla)`) in the slash-command autocomplete after upgrading from a pre-plugin install.

## [2.1.0] - 2026-05-12

### Added
- `hopla-claude-setup --setup-statusline` and `--remove-statusline` flags: the CLI now wires the Hopla statusline into `~/.claude/settings.json` automatically. `uninstall` removes it. Manual JSON snippet is documented as a fallback only.
- `node:test` test suite (`npm test`) — 34 unit + integration tests covering `cli.js` helpers (`parseSettingsFile`, `safeWrite`, the new `setupStatusline`/`removeStatusline`) and the three core hooks (`env-protect`, `tsc-check`, `prompt-route`). Zero external dependencies — uses Node's built-in test runner.
- GitHub Actions CI (`.github/workflows/ci.yml`): runs on every PR and push to main — JSON validation, version sync check, `npm test`, CLI dry-runs, and the `hook-audit` manual smoke test.
- `CONTRIBUTING.md` with local development, testing, and PR guidelines.
- `SECURITY.md` with the vulnerability disclosure process and the plugin's threat model (which hooks intercept which tool calls).
- `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1).
- `.github/PULL_REQUEST_TEMPLATE.md` and `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.md`.
- Frontmatter `description:` on the 9 guides in `commands/guides/` so they appear with hints in the slash-command autocomplete.

### Changed
- **i18n cleanup** — the plugin is now language-agnostic. Spanish trigger phrases removed from the descriptions of `brainstorm`, `verify`, `performance`, `debug` skills. Users configure their preferred response language in their own `~/.claude/CLAUDE.md`.
- **`hooks/prompt-route.js` refactored to a hybrid matcher**: the hardcoded `SKILL_TRIGGERS` array is gone. The hook discovers skills at runtime by reading `SKILL.md` files; matching uses an optional `triggers:` frontmatter override, falling back to auto-derive from the skill name and quoted phrases in the description. New skills are matched without code changes.
- **`hooks/tsc-check.js` filters by file extension**: editing a `.md` file no longer triggers `tsc --noEmit`. Only `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs`, `.cjs` files invoke the check.
- `cli.js`: `parseSettingsFile` and `safeWrite` are now exported for testing. The main dispatcher is gated by an `isMainModule` check so the file can be imported as a library by tests.
- `hooks/statusline.js` header comment points users at the new CLI flag rather than a hardcoded JSON snippet.
- README "Optional: Hopla statusline" section recommends the CLI flag; manual JSON setup kept as a fallback note.
- `CLAUDE.md` §5 (Testing) and §6 (Release flow) now describe `npm test` and the CI verification step.
- `hooks/prompt-route.js` `triggers:` override added to `skills/code-review/SKILL.md` so phrases like "review my code" (with words between "review" and "code") match the skill.

### Removed
- Temporary `.DS_Store` artifact at repo root (already in `.gitignore`).

### Notes for plugin authors
- Skill discovery in Claude Code v1.24 does **not** support nested `skills/<subdir>/<name>/SKILL.md` paths. The 9 reference guides remain in `commands/guides/*.md` and ship with `description:` frontmatter. A future migration to `skills/` will revisit this if the platform adds support.

## [2.0.0] - 2026-05-12

### Added
- `LICENSE` (MIT) in repo root for legal clarity in npm + GitHub.
- `description`, `repository`, `homepage`, `bugs` fields in `package.json` for proper npm registry display.
- `$schema` field in `plugin.json` and `marketplace.json` for JSON Schema validation in editors.
- This `CHANGELOG.md` (full history back to 1.13.0 below).
- `LICENSE` and `CHANGELOG.md` are now included in the published npm tarball via `files[]`.

### Changed
- **Breaking:** repository slug in `plugin.json` corrected from `hopla-tools/claude-setup` (404) to `HOPLAtools/claude-setup` (the real GitHub org).
- `plugin.json` `homepage` differentiated from `repository`: now points to `#readme` anchor.
- README install snippet simplified: `/plugin marketplace add HOPLAtools/claude-setup` (one argument — the canonical form per Anthropic docs).
- All CLI references in README updated from `claude-setup` to `hopla-claude-setup`.

### Removed
- **Breaking:** bin alias `claude-setup` removed from `package.json`. The package now exposes only `hopla-claude-setup`. Migration: replace any script that calls `claude-setup` with `hopla-claude-setup` — same flags, same behavior. Rationale: the generic name risked colliding with other npm packages distributed publicly.

## [1.19.0] - 2026-05-11

### Added
- New `hopla:hook-audit` skill — mechanical pre-commit checks for new React hooks against 4 documented bug classes (P-5 memoization, S-8 stale-id guard, E-1 error matching, D-1 cache + dedup integrity).

### Changed
- Documentation aligned with the canonical `/plugin marketplace update <name>` flow introduced in Claude Code v1.24+. The older `cd … && git pull` dance is no longer prescribed.

## [1.18.0] - 2026-05-11

### Added
- OpenSpec wave 1: `AGENTS.md` (canonical project rules) with a CLAUDE.md alias path.
- `.agents/specs/canonical/` for living requirements documents.
- `/hopla:archive` command — folds delta-specs from completed plans into canonical specs and moves artifacts to archive locations.
- `claude-setup status` subcommand — read-only inspection of the current project's `.agents/` workflow (plans, specs, reviews, suggested next step). JSON output available via `--json`.

## [1.17.1] - 2026-05-01

### Changed
- `plan-feature` now enforces UX iteration budget declaration when the feature touches a visible UI surface.
- `plan-feature` now requires a `## Domain Assumptions` section when the feature uses project-specific vocabulary.

## [1.17.0] - 2026-04-17

### Added
- New skills: `refactoring`, `performance`, `migration`.
- Spec linking — plans can reference and update canonical specs.
- `.agents/audits/` directory for audit artifacts.

## [1.16.0] - 2026-04-17

### Changed
- Refactor: progressive disclosure across skills, shared references between skills (e.g. `worktree` cites `git/flow-detection.md`), cleaner telemetry.

## [1.15.0] - 2026-04-17

### Added
- MCP server template (`.mcp.json.template`).
- New hooks: `UserPromptSubmit` (skill routing hints), `PreCompact` (session state snapshot).
- Optional statusline renderer (`hooks/statusline.js`) showing branch · worktree indicator · uncommitted count · active plan.

## [1.14.1] - 2026-04-17

### Fixed
- 7 critical audit findings (see commit `69c025b` for the full list).

## [1.14.0] - 2026-04-17

### Added
- CLI `--dry-run` flag that composes with any other flag.
- CLI cleans legacy agents (`code-reviewer.md`, `codebase-researcher.md`, `system-reviewer.md`) and legacy `PLANNING_PERMISSIONS` from older installs.
- CLI prints an advisory when the plugin or marketplace cache is still present (the CLI cannot remove those — the user does).

## [1.13.0] - 2026-04-17

### Added
- `git` skill integrated with `worktree` skill via centralized Git Flow detection in `flow-detection.md`.

---

For releases prior to 1.13.0, see the git history (`git log --oneline`).
