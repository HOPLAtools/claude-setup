# Changelog

All notable changes to **@hopla/claude-setup** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
