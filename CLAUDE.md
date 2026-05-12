# @hopla/claude-setup — Development Rules

## 1. Core Principles

- `global-rules.md` is a **template** installed to users' `~/.claude/CLAUDE.md` — it is NOT this project's rules
- `commands/*.md` are Claude Code slash commands for users — Markdown files, not scripts
- `skills/<name>/SKILL.md` is each skill's entry point. A skill may include extra files (e.g. `commit.md`, `pr.md`, `flow-detection.md` in `skills/git/`) that the `SKILL.md` references as workflows or shared libraries
- Shared references across skills: a file inside one skill can be cited by another (e.g. `skills/worktree/SKILL.md` references `../git/flow-detection.md`). Centralize Git Flow, branching, and similar logic in one place and reference it — do not duplicate
- `agents/*.md` are specialized subagent definitions
- `hooks/*.js` are event-driven hooks; `hooks/hooks.json` declares them for the plugin system
- `cli.js` is a single-file Node.js ESM script — keep it that way, no external dependencies
- This repo serves **two distribution channels**: Claude Code plugin (primary) AND npm CLI (global rules only)
- **The GitHub repo MUST be public** — the plugin channel clones it via `/plugin marketplace add`. A private repo makes the plugin install fail silently for anyone outside the org
- Any change to `commands/`, `skills/`, `agents/`, `hooks/`, or `global-rules.md` affects every future user — review carefully before committing
- Bump `version` in **all three files** before every release: `package.json`, `.claude-plugin/plugin.json`, AND `.claude-plugin/marketplace.json`
- Plugin update flow (Claude Code v1.24+): auto-update is opt-in per marketplace (third-party marketplaces default to **disabled**). Users who opt in get new versions automatically on session start. Users who don't refresh manually with `/plugin marketplace update hopla-marketplace` → `/plugin disable` → `/plugin enable` → `/reload-plugins`. Document the auto-update opt-in prominently in the README; do **not** prescribe the old `cd … && git pull` dance — `/plugin marketplace update` is the canonical path now

---

## 2. Tech Stack

- **Runtime:** Node.js ≥18
- **Language:** JavaScript (ESM, `"type": "module"`)
- **Package manager:** npm
- **Entry point:** `cli.js` (CLI channel), `.claude-plugin/plugin.json` (plugin channel)
- No TypeScript, no bundler, no test framework, no linter, no external dependencies

---

## 3. Architecture

```
.claude-plugin/
├── plugin.json      ← Plugin manifest (name, version, metadata) ⚠️ bump on release
└── marketplace.json ← Self-hosted marketplace definition ⚠️ bump on release
cli.js               ← CLI entry point — installs global-rules.md + permissions only
global-rules.md      ← Global rules template → installed to ~/.claude/CLAUDE.md (CLI only)
commands/            ← Slash commands (auto-discovered by plugin)
│   └── guides/      ← Reference guides loaded on-demand
skills/              ← Auto-triggered skills (auto-discovered by plugin)
│   ├── <name>/SKILL.md            ← required entry point
│   └── <name>/<extra>.md          ← optional workflow or shared-reference files
│                                    e.g. skills/git/{commit.md, pr.md, flow-detection.md}
agents/              ← Subagent definitions (auto-discovered by plugin)
│   └── *.md
hooks/               ← Event hooks (auto-discovered by plugin via hooks.json)
│   ├── hooks.json              ← Plugin hook declarations (uses ${CLAUDE_PLUGIN_ROOT})
│   ├── tsc-check.js            ← PostToolUse: tsc --noEmit after edits
│   ├── env-protect.js          ← PreToolUse: block reads of .env (Read/Grep/Bash)
│   ├── session-prime.js        ← SessionStart: git context + skills list + compact-snapshot replay
│   ├── prompt-route.js         ← UserPromptSubmit: skill routing hints
│   ├── precompact-snapshot.js  ← PreCompact: dump state to .claude/compact-snapshot.json
│   └── statusline.js           ← Statusline renderer (opt-in via settings.json)
package.json         ← npm metadata and version
CLAUDE.md            ← THIS FILE — project dev rules (not installed to users)
README.md            ← Public documentation
```

**Distribution channels:**

| Channel | Install | What it provides |
|---|---|---|
| **Plugin** | `/plugin install hopla@hopla-marketplace` | Commands, skills, agents, hooks |
| **CLI (npm)** | `npm i -g @hopla/claude-setup && claude-setup` | Global rules (`~/.claude/CLAUDE.md`) + permissions |

**CLI install flow (cli.js):**
```
create ~/.claude/ dir
→ removeLegacyFiles()         ← cleans residuals from older CLI versions:
                                • ~/.claude/commands/hopla-* (pre-v1.12)
                                • ~/.claude/skills/hopla-*/ (pre-v1.12)
                                • ~/.claude/hooks/{tsc-check,env-protect,session-prime}.js (pre-v1.13)
                                • ~/.claude/agents/{code-reviewer,codebase-researcher,system-reviewer}.md (v1.11–v1.12)
                                • hopla hook entries in settings.json AND settings.local.json
→ install global-rules.md     → ~/.claude/CLAUDE.md
→ setupPermissions()          → ~/.claude/settings.json (adds current HOPLA_PERMISSIONS)
```

The uninstall flow additionally removes `HOPLA_PERMISSIONS` **and** `LEGACY_PERMISSIONS` (e.g. PLANNING_PERMISSIONS from v1.11.0) from both settings files, and prints an advisory when the plugin or marketplace cache is still present — the CLI cannot remove those, so the user is told how.

**Key rules:**

- Commands, skills, agents, and hooks are **only delivered by the plugin** — the CLI no longer copies them
- **Never duplicate** a command and a skill with the same name — both appear in Claude's autocomplete, causing duplicates. Use commands for explicit `/slash` invocation only; use skills for auto-triggered behavior
- `hooks/hooks.json` uses `${CLAUDE_PLUGIN_ROOT}` paths for the plugin channel
- When removing an installed artifact (command, skill, agent, hook, permission) in a new version, add its old name/path to the legacy cleanup lists in `cli.js` so existing users get it cleaned on next `install` / `--migrate` / `--uninstall`

---

## 4. Code Style

### JavaScript (cli.js)
- ESM only — `import`/`export`, never `require()`
- Node.js built-ins only — never add external packages
- All logic stays in a single file

### Command files (commands/*.md)

- Filename: `[kebab-case-name].md` — the plugin namespaces it as `/hopla:[name]`

---

## 5. Testing

Automated unit + integration tests run via Node's built-in `node:test` runner (no external test framework — same "Node built-ins only" rule as `cli.js`). The CI workflow at `.github/workflows/ci.yml` runs them on every PR and push to `main`.

```bash
npm test                             # full suite (cli.js helpers + 3 hook scripts)
node --test tests/cli.test.js        # one file
bash skills/hook-audit/tests/manual-test.sh   # the hook-audit smoke
```

Tests live in `tests/`:

```
tests/
├── cli.test.js                     parseSettingsFile + safeWrite + CLI integration tests
├── helpers/fixtures.js             tempdir, JSON I/O, cleanup helpers
└── hooks/
    ├── env-protect.test.js         block .env reads + benign-Bash allow
    ├── tsc-check.test.js           extension filter + tsconfig short-circuit
    └── prompt-route.test.js        hybrid matcher (name + quoted phrases + triggers override)
```

Manual smoke (use in addition to `npm test` for any change touching the CLI install/uninstall flow):

```bash
node cli.js                            # interactive install flow (global rules + permissions only)
node cli.js --force                    # install without prompts
node cli.js --uninstall                # verify uninstall (includes legacy cleanup)
node cli.js --migrate                  # remove legacy CLI duplicates only
node cli.js --version                  # verify version string
node cli.js --dry-run --uninstall --force   # preview what uninstall would remove, without touching disk
node cli.js --dry-run --force          # preview what install would do, without touching disk
node cli.js --dry-run --setup-statusline --force    # preview statusline setup
```

**`--dry-run`** composes with any other flag and prints what would change without writing anything. Use it before testing destructive paths on a real `~/.claude/` directory.

**Post-install verification:**
- `~/.claude/CLAUDE.md` is installed and `diff` matches `global-rules.md`
- No `hopla-*` files in `~/.claude/commands/` or `~/.claude/skills/`
- No residual legacy agents in `~/.claude/agents/` (`code-reviewer.md`, `codebase-researcher.md`, `system-reviewer.md` must only exist if installed by the plugin, not by the CLI)
- `settings.json` has the current `HOPLA_PERMISSIONS` and no obsolete `LEGACY_PERMISSIONS`
- User-owned permissions (not in the HOPLA lists) are preserved untouched

**Plugin channel verification:**
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are valid JSON
- Versions in `package.json`, `plugin.json`, and `marketplace.json` match exactly

---

## 6. Development Commands

```bash
node cli.js              # Run CLI locally (global rules + permissions)
node cli.js --force      # Force install, overwrite without prompting
node cli.js --uninstall  # Uninstall global rules + clean up legacy files
node cli.js --migrate    # Remove legacy CLI duplicates only
node cli.js status       # Read-only: inspect current project's .agents/ workflow (plans, specs, reviews, suggested next)
node cli.js status --json # Same, machine-readable JSON for agents
node cli.js --dry-run    # Preview changes without writing (composes with any other flag)
node cli.js --version    # Print package version
npm publish              # Publish to npm (bump version in package.json + plugin.json + marketplace.json first)
```

**Release flow:**

1. Bump version in `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (must match — `scripts/check-versions.js` runs as `prepublishOnly` and blocks publish if they diverge)
2. `git commit` + open PR
3. **Verify CI is green** on the PR before merging (`.github/workflows/ci.yml` runs JSON validation, `check-versions`, `npm test`, CLI dry-runs, and `hook-audit/tests/manual-test.sh`)
4. Merge PR to `main`
5. `npm publish` from `main` (only affects the CLI channel — the plugin channel is updated by Claude Code reading the git repo)
6. Plugin-channel users with auto-update enabled get the new version at next session start, automatically. Users without auto-update refresh via:
   ```
   /plugin marketplace update hopla-marketplace
   /plugin disable hopla@hopla-marketplace
   /plugin enable hopla@hopla-marketplace
   /reload-plugins
   ```
   In commit messages and release notes, reference this canonical flow — **do not** repeat the old `cd … && git pull` dance.

---

## 7. Task-Specific Reference Guides

**When adding a new slash command:**
Read: `.agents/guides/add-command.md`
This guide covers: file naming, content structure, legacy cleanup, local testing

**When updating the global template (`global-rules.md`):**
Read: `.agents/guides/update-global-template.md`
This guide covers: what to change, impact on existing users, validation

**When modifying the CLI (`cli.js`):**
Read: `.agents/guides/modify-cli.md`
This guide covers: install/uninstall flows, permissions setup, adding flags, testing

**When publishing a new version:**
Read: `.agents/guides/publish-npm.md`
This guide covers: version bump (package.json + plugin.json + marketplace.json), local verification, publish checklist
