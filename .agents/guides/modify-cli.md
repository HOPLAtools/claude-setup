# Guide: Modifying the CLI (cli.js)

## When to Use This Guide

Load this guide when: modifying `cli.js` (the main CLI script users run as `claude-setup`).

---

## Architecture Pattern

```
cli.js
├── Constants              (CLAUDE_DIR, COMMANDS_DIR, FILES_DIR, colors, flags)
├── confirm()              ← readline prompt — always respects --force flag
├── installFile()          ← copies a single file, handles exists/overwrite logic
├── removeFile()           ← removes a single file
├── LEGACY_FILES           ← old command filenames to clean up on install
├── removeLegacyFiles()    ← called at start of install()
├── install()              ← main install flow
├── HOPLA_PERMISSIONS      ← list of permissions to add to settings.json
├── setupPermissions()     ← adds permissions to ~/.claude/settings.json
├── uninstall()            ← main uninstall flow
└── run()                  ← entry: routes to install or uninstall based on flags
```

Key rules:
- Node.js built-ins only — never `import` external packages
- `--force` must be respected in any interactive prompt — always use `confirm()`, never raw readline
- Install and uninstall flows must stay symmetric: if install adds something, uninstall must remove it

---

## Reference Files

- `cli.js` — the only file to edit (all logic in one place)

---

## Step-by-Step Implementation

### Adding a new CLI flag
1. Add `const FLAG = process.argv.includes('--flag-name')` near the top with other flag constants
2. Branch logic at the bottom of the file (similar to `const run = UNINSTALL ? uninstall : install`)
3. Test: `node cli.js --flag-name`

### Adding a new file to install
1. Place the file in `files/` (or `files/commands/` for slash commands)
2. If it's in `files/commands/`, **no changes to `cli.js` needed** — auto-discovered
3. If it's outside `files/commands/`, add:
   - An `installFile()` call inside `install()`
   - A `removeFile()` call inside `uninstall()`

### Adding a new permission to HOPLA_PERMISSIONS
1. Add the permission string to the `HOPLA_PERMISSIONS` array
2. Format: `"Bash(command *)"` or `"Bash(command subcommand *)"`
3. Test: `node cli.js --force` and check `~/.claude/settings.json`

### Adding legacy file cleanup
When renaming or removing a command:
1. Add the old filename (e.g. `hopla-old-name.md`) to the `LEGACY_FILES` array
2. `removeLegacyFiles()` will clean it from users' machines on next install

---

## Common Pitfalls

- **Adding external dependencies:** Zero dependencies by design — use only Node built-ins
- **Bypassing `confirm()` for prompts:** Always use `confirm()` so `--force` works correctly
- **Install/uninstall asymmetry:** If `install()` adds something, `uninstall()` must remove it

---

## Validation

After implementing, verify:
- [ ] `node cli.js` — interactive flow works correctly
- [ ] `node cli.js --force` — force flow works without prompts
- [ ] `node cli.js --uninstall` — removes the right files
- [ ] `node cli.js --version` — still prints version correctly
