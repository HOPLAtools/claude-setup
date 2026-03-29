# @hopla/claude-setup — Development Rules

## 1. Core Principles

- `global-rules.md` is a **template** installed to users' `~/.claude/CLAUDE.md` — it is NOT this project's rules
- `commands/*.md` are Claude Code slash commands for users — Markdown files, not scripts
- `skills/*/SKILL.md` are auto-triggered skills discovered by Claude Code's plugin system
- `agents/*.md` are specialized subagent definitions
- `hooks/*.js` are event-driven hooks; `hooks/hooks.json` declares them for the plugin system
- `cli.js` is a single-file Node.js ESM script — keep it that way, no external dependencies
- This repo serves **two distribution channels**: Claude Code plugin AND npm CLI
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
cli.js               ← CLI entry point (single file, Node built-ins only)
global-rules.md      ← Global rules template → installed to ~/.claude/CLAUDE.md (CLI only)
commands/            ← Slash commands (auto-discovered by plugin + CLI)
│   ├── hopla-*.md
│   └── guides/      ← Reference guides loaded on-demand
skills/              ← Auto-triggered skills (auto-discovered by plugin + CLI)
│   └── <name>/SKILL.md
agents/              ← Subagent definitions (auto-discovered by plugin + CLI)
│   └── *.md
hooks/               ← Event hooks (auto-discovered by plugin via hooks.json, copied by CLI)
│   ├── hooks.json   ← Plugin hook declarations (uses ${CLAUDE_PLUGIN_ROOT})
│   ├── tsc-check.js
│   ├── env-protect.js
│   └── session-prime.js
package.json         ← npm metadata and version
CLAUDE.md            ← THIS FILE — project dev rules (not installed to users)
README.md            ← Public documentation
```

**Distribution channels:**

| Channel | Install | Updates | Installs global-rules.md? |
|---------|---------|---------|---------------------------|
| **Plugin** | `/plugin install hopla@hopla-marketplace` | Automatic on version bump | No — plugin can't write to ~/.claude/CLAUDE.md |
| **CLI (npm)** | `npm i -g @hopla/claude-setup && claude-setup` | Manual: `npm i -g @latest && claude-setup --force` | Yes |

**CLI install flow (cli.js):**
```
create ~/.claude/ dirs
→ removeStaleCommands()       ← cleans up renamed/removed commands
→ install global-rules.md     → ~/.claude/CLAUDE.md
→ install commands/*.md       → ~/.claude/commands/ (auto-discovered)
→ setupPermissions()          → ~/.claude/settings.json
→ installSkills()             → ~/.claude/skills/ (auto-discovered)
→ installAgents()             → ~/.claude/agents/ (auto-discovered)
→ installHooks()              → ~/.claude/hooks/ + settings.json
```

**Key rules:**
- New commands in `commands/` are **auto-discovered** by both channels — no changes to `cli.js` needed
- **Never duplicate** a command and a skill with the same name — both appear in Claude's autocomplete, causing duplicates. Use commands for explicit `/slash` invocation only; use skills for auto-triggered behavior
- `hooks/hooks.json` uses `${CLAUDE_PLUGIN_ROOT}` paths for the plugin channel; the CLI writes absolute `~/.claude/hooks/` paths to `settings.json` independently

---

## 4. Code Style

### JavaScript (cli.js)
- ESM only — `import`/`export`, never `require()`
- Node.js built-ins only — never add external packages
- All logic stays in a single file

### Command files (commands/*.md)
- Filename: `hopla-[kebab-case-name].md` — this becomes the slash command `/hopla-[name]`
- If renaming a command, add the old filename to `LEGACY_FILES` in `cli.js`

---

## 5. Testing

No automated tests. Test manually after any change:

```bash
node cli.js            # interactive install flow
node cli.js --force    # install without prompts
node cli.js --uninstall  # verify uninstall
node cli.js --version  # verify version string
```

Verify files landed correctly in `~/.claude/` and `~/.claude/commands/`.

For the plugin channel, verify `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are valid JSON and versions match `package.json`.

---

## 6. Development Commands

```bash
node cli.js              # Run CLI locally (interactive)
node cli.js --force      # Force install, overwrite all without prompting
node cli.js --uninstall  # Uninstall all files from ~/.claude/
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
