# Guide: Updating the Global Template (global-rules.md)

## When to Use This Guide

Load this guide when: modifying `global-rules.md` (the template installed to users' `~/.claude/CLAUDE.md`).

---

## Architecture Pattern

```
global-rules.md  →  (hopla-claude-setup install, cli.js)  →  ~/.claude/CLAUDE.md (user's machine)
```

This file is the **global rules template** distributed to every CLI user. Changes here affect all future installs, and every user who re-runs `hopla-claude-setup` (or `--force`) to update. It is NOT this repo's rules (those are `AGENTS.md`, loaded through `.claude/CLAUDE.md`).

Key rules:
- Changes are NOT retroactive — existing users only get updates when they re-run `hopla-claude-setup`
- The installed file is loaded in every Claude Code session — keep it focused and concise
- Do NOT add project-specific or maintainer-specific content — it must work for any project, any user (personal approvals belong in `~/.claude/rules/`, which the installer never touches)

---

## Reference Files

- `global-rules.md` — the file to edit
- `tests/global-rules.test.js` — guards the "Models, Effort & Cost" section (short, one `/clear` mention)
- `tests/git-skill.test.js` — asserts a §3 line of the template ("Auto-commit or auto-push without explicit approval")

---

## Step-by-Step Implementation

### 1. Open `global-rules.md`
This is the only file to edit for global rule changes.

### 2. Make your changes
- Keep rules general — they must apply to any project, any tech stack
- Avoid stack-specific tooling references (e.g. don't mention project-specific commands)
- Preserve the existing section structure unless deliberately restructuring; don't repeat a rule another section already has

### 3. Test without overwriting your own rules
`node cli.js --force` against your real `$HOME` replaces your `~/.claude/CLAUDE.md`. Preview or use a throwaway home instead:
```bash
node cli.js --dry-run --force
HOME="$(mktemp -d)" node cli.js --force && cat "$HOME/.claude/CLAUDE.md"
```
Then run `npm test` (the template tests above).

### 4. Bump the version
A meaningful change to `global-rules.md` is a release: bump the version in `package.json`, `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` (they must match — `node scripts/check-versions.js`) and add a CHANGELOG entry. See `.agents/guides/publish-npm.md`.

---

## Common Pitfalls

- **Adding project-specific rules:** global rules must be stack-agnostic
- **Making the file too long:** Claude Code loads it in every session — keep it concise
- **Testing against your real home:** `--force` overwrites your own `~/.claude/CLAUDE.md`; use `--dry-run` or a temp `HOME`

---

## Validation

After implementing, verify:
- [ ] `node cli.js --dry-run --force` completes without error
- [ ] With a temp `HOME`, `~/.claude/CLAUDE.md` contains the expected changes
- [ ] `npm test` passes (including `tests/global-rules.test.js`)
- [ ] Versions bumped in all three files (`node scripts/check-versions.js`)
