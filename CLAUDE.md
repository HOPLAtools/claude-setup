# @hopla/claude-setup — Development Rules

## 1. Core Principles

- `files/CLAUDE.md` is a **template** installed to users' `~/.claude/CLAUDE.md` — it is NOT this project's rules
- `files/commands/*.md` are Claude Code slash commands for users — Markdown files, not scripts
- `cli.js` is a single-file Node.js ESM script — keep it that way, no external dependencies
- Any change to `files/` affects every future user install — review carefully before committing
- Bump `version` in `package.json` before every `npm publish`

---

## 2. Tech Stack

- **Runtime:** Node.js ≥18
- **Language:** JavaScript (ESM, `"type": "module"`)
- **Package manager:** npm
- **Entry point:** `cli.js`
- No TypeScript, no bundler, no test framework, no linter, no external dependencies

---

## 3. Architecture

```
cli.js               ← CLI entry point (single file, Node built-ins only)
files/
├── CLAUDE.md        ← Global rules template → installed to ~/.claude/CLAUDE.md
├── commands/        ← Slash commands → installed to ~/.claude/commands/
│   └── hopla-*.md
└── skills/          ← Auto-triggered skills → installed to ~/.claude/skills/
    └── <name>/SKILL.md
package.json         ← npm metadata and version
README.md            ← Public documentation
```

**Install flow (cli.js):**
```
create ~/.claude/ dirs
→ removeLegacyFiles()          ← cleans up renamed/removed commands
→ install files/CLAUDE.md      → ~/.claude/CLAUDE.md
→ install files/commands/*.md  → ~/.claude/commands/ (auto-discovered)
→ setupPermissions()           → ~/.claude/settings.json
```

**Key rules:**
- New commands in `files/commands/` are **auto-discovered** — no changes to `cli.js` needed when adding one
- **Never duplicate** a command and a skill with the same name — both appear in Claude's autocomplete, causing duplicates. Use commands for explicit `/slash` invocation only; use skills for auto-triggered behavior

---

## 4. Code Style

### JavaScript (cli.js)
- ESM only — `import`/`export`, never `require()`
- Node.js built-ins only — never add external packages
- All logic stays in a single file

### Command files (files/commands/*.md)
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

---

## 6. Development Commands

```bash
node cli.js              # Run CLI locally (interactive)
node cli.js --force      # Force install, overwrite all without prompting
node cli.js --uninstall  # Uninstall all files from ~/.claude/
node cli.js --version    # Print package version
npm publish              # Publish to npm (bump version in package.json first)
```

---

## 7. Task-Specific Reference Guides

**When adding a new slash command:**
Read: `.agents/guides/add-command.md`
This guide covers: file naming, content structure, legacy cleanup, local testing

**When updating the global template (`files/CLAUDE.md`):**
Read: `.agents/guides/update-global-template.md`
This guide covers: what to change, impact on existing users, validation

**When modifying the CLI (`cli.js`):**
Read: `.agents/guides/modify-cli.md`
This guide covers: install/uninstall flows, permissions setup, adding flags, testing

**When publishing a new version to npm:**
Read: `.agents/guides/publish-npm.md`
This guide covers: version bump, local verification, publish checklist
