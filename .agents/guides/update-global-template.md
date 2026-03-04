# Guide: Updating the Global Template (files/CLAUDE.md)

## When to Use This Guide

Load this guide when: modifying `files/CLAUDE.md` (the template installed to users' `~/.claude/CLAUDE.md`).

---

## Architecture Pattern

```
files/CLAUDE.md  →  (cli.js install)  →  ~/.claude/CLAUDE.md (user's machine)
```

This file is the **global rules template** distributed to every user. Changes here affect all future installs, and all users who run `claude-setup --force` to update.

Key rules:
- Changes are NOT retroactive — existing users only get updates when they re-run `claude-setup`
- This file is loaded in every Claude Code session — keep it focused and concise
- Do NOT add project-specific content — it must work for any project, any user

---

## Reference Files

- `files/CLAUDE.md` — the file to edit

---

## Step-by-Step Implementation

### 1. Open `files/CLAUDE.md`
This is the only file to edit for global rule changes.

### 2. Make your changes
- Keep rules general — they must apply to any project, any tech stack
- Avoid stack-specific tooling references (e.g. don't mention project-specific commands)
- Preserve the existing section structure unless deliberately restructuring

### 3. Test by installing locally
```bash
node cli.js --force
```
Then open `~/.claude/CLAUDE.md` and verify the content is correct.

### 4. Bump the version
Any meaningful change to `files/CLAUDE.md` warrants a patch version bump in `package.json`.

---

## Common Pitfalls

- **Adding project-specific rules:** Global rules must be stack-agnostic
- **Making the file too long:** Claude Code loads this in every session — keep it concise
- **Forgetting to test the install:** Always run `node cli.js --force` and check `~/.claude/CLAUDE.md`

---

## Validation

After implementing, verify:
- [ ] `node cli.js --force` completes without error
- [ ] `~/.claude/CLAUDE.md` contains the expected changes
