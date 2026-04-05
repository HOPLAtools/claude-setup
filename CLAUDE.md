# @hopla/claude-setup — Development Rules

## 1. Core Principles

- `global-rules.md` is a **template** installed to users' `~/.claude/CLAUDE.md` — it is NOT this project's rules
- `commands/*.md` are Claude Code slash commands for users — Markdown files, not scripts
- `skills/*/SKILL.md` are auto-triggered skills discovered by Claude Code's plugin system
- `agents/*.md` are specialized subagent definitions
- `hooks/*.js` are event-driven hooks; `hooks/hooks.json` declares them for the plugin system
- `cli.js` is a single-file Node.js ESM script — keep it that way, no external dependencies
- This repo serves **two distribution channels**: Claude Code plugin (primary) AND npm CLI (global rules only)
- Any change to `commands/`, `skills/`, `agents/`, `hooks/`, or `global-rules.md` affects every future user — review carefully before committing
- Bump `version` in **all three files** before every release: `package.json`, `.claude-plugin/plugin.json`, AND `.claude-plugin/marketplace.json`

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
│   └── <name>/SKILL.md
agents/              ← Subagent definitions (auto-discovered by plugin)
│   └── *.md
hooks/               ← Event hooks (auto-discovered by plugin via hooks.json)
│   ├── hooks.json   ← Plugin hook declarations (uses ${CLAUDE_PLUGIN_ROOT})
│   ├── tsc-check.js
│   ├── env-protect.js
│   └── session-prime.js
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
→ removeLegacyFiles()         ← cleans up old CLI-installed commands/skills/hooks
→ install global-rules.md     → ~/.claude/CLAUDE.md
→ setupPermissions()          → ~/.claude/settings.json
```

**Key rules:**

- Commands, skills, agents, and hooks are **only delivered by the plugin** — the CLI no longer copies them
- **Never duplicate** a command and a skill with the same name — both appear in Claude's autocomplete, causing duplicates. Use commands for explicit `/slash` invocation only; use skills for auto-triggered behavior
- `hooks/hooks.json` uses `${CLAUDE_PLUGIN_ROOT}` paths for the plugin channel

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

No automated tests. Test manually after any change:

```bash
node cli.js            # interactive install flow (global rules + permissions only)
node cli.js --force    # install without prompts
node cli.js --uninstall  # verify uninstall (includes legacy cleanup)
node cli.js --migrate  # remove legacy CLI duplicates only
node cli.js --version  # verify version string
```

Verify `~/.claude/CLAUDE.md` was installed. Verify no `hopla-*` files in `~/.claude/commands/` or `~/.claude/skills/`.

For the plugin channel, verify `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are valid JSON and versions match `package.json`.

---

## 6. Development Commands

```bash
node cli.js              # Run CLI locally (global rules + permissions)
node cli.js --force      # Force install, overwrite without prompting
node cli.js --uninstall  # Uninstall global rules + clean up legacy files
node cli.js --migrate    # Remove legacy CLI duplicates only
node cli.js --version    # Print package version
npm publish              # Publish to npm (bump version in package.json + plugin.json + marketplace.json first)
```

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
