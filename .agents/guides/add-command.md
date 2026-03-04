# Guide: Adding a New Slash Command

## When to Use This Guide

Load this guide when: adding a new `hopla-*` slash command to the system.

---

## Architecture Pattern

```
files/commands/hopla-[name].md  ← Create this file
```

New commands are **auto-discovered** by `cli.js` — the install loop reads all files from `files/commands/` at runtime. **No changes to `cli.js` are needed when adding a command.**

Key rules:
- Filename must be `hopla-[kebab-case-name].md` — this becomes the slash command `/hopla-[name]`
- If **renaming** an existing command, add the old filename to `LEGACY_FILES` in `cli.js`
- Command content is Markdown — write clear, step-by-step instructions for Claude Code to follow

---

## Reference Files

Follow these as patterns:
- `files/commands/hopla-git-commit.md` — simpler, single-purpose command
- `files/commands/hopla-plan-feature.md` — complex multi-step command

---

## Step-by-Step Implementation

### 1. Create the command file
- Path: `files/commands/hopla-[kebab-case-name].md`
- Optionally add frontmatter for a description shown in Claude Code:
  ```markdown
  ---
  description: Short description of what this command does
  ---
  ```

### 2. Write the command content
- Structure with clear steps Claude should follow
- Be specific — vague instructions lead to inconsistent behavior
- Reference files or guides the command should read when it runs

### 3. If renaming an existing command
- Open `cli.js`
- Add the old filename (e.g. `hopla-old-name.md`) to the `LEGACY_FILES` array
- This cleans it up from users' `~/.claude/commands/` on next install

### 4. Test locally
```bash
node cli.js --force
```
Verify the new command appears in the success output list and exists at `~/.claude/commands/hopla-[name].md`.

### 5. Update README.md
Add the new command to the commands table in the README.

---

## Common Pitfalls

- **Missing `hopla-` prefix:** All commands must be prefixed to avoid conflicts
- **Not adding old name to `LEGACY_FILES` when renaming:** The old command stays on users' systems indefinitely
- **Vague command content:** Claude follows instructions literally — be specific and step-by-step

---

## Validation

After implementing, verify:
- [ ] `node cli.js --force` — new command appears in success output
- [ ] File exists at `~/.claude/commands/hopla-[name].md`
- [ ] Command is accessible in Claude Code as `/hopla-[name]`
