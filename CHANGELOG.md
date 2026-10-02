# Changelog

All notable changes to **@hopla/claude-setup** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [2.3.0] - 2026-10-02

Follow-ups from the 2.2 review and the interactive checks. No breaking changes.

### Fixed
- **Session-start context replays the pre-compact snapshot only after `/compact` or on resume.** Before, it was replayed on every session start (startup, `/clear`, fork) for two hours, bringing back context the user had just cleared. With no payload (manual runs) the snapshot is still replayed.
- **`env-protect` covers `MultiEdit`**: the matcher now includes it, and `.dev.vars` is blocked for MultiEdit like Edit.
- **`tsc-check` no longer passes silently on a solution-style `tsconfig.json`** (only `references`, `files: []`): it skips it and shows a one-line notice instead of running a check that covers nothing.
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
