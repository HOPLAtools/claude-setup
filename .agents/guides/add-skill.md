# Guide: Adding a New Skill

## When to Use This Guide

Load this guide when adding a skill to the plugin (anything users run as `/hopla:<name>` or that Claude triggers on its own). Since 3.0 there are no commands: everything is a skill.

For frontmatter, descriptions, `when_to_use`, forks and arguments, follow `skills/guides-write-skill/SKILL.md` — this guide only covers the repo-specific steps around it.

---

## Steps

### 1. Create the skill
- Path: `skills/<kebab-case-name>/SKILL.md`, frontmatter `name: <kebab-case-name>` (must equal the directory).
- A guide is `skills/guides-<name>/SKILL.md` with `name: guides:<name>` (invoked as `/hopla:guides:<name>`).
- Never nest a skill (`skills/<a>/<b>/SKILL.md`): Claude Code does not load it.
- Never reuse a name another skill already resolves to.

### 2. Write the body
- **First line after the frontmatter is the language directive:**
  ```
  > 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.
  ```
- Clear, specific steps; reference other plugin files as `${CLAUDE_PLUGIN_ROOT}/skills/<x>/SKILL.md`.
- No positional placeholders (`$` + digit): use `arguments: [...]` and `$name`.

### 3. Pin it in the tests
- `tests/frontmatter.test.js`: add it to the expected sets it belongs to (FORKS, INHERIT, MANUAL_ONLY, ARGUMENTS).
- Add a prose guard test if the skill carries rules that must not regress (see `tests/git-skill.test.js`).

### 4. Test locally
```bash
npm test
claude plugin validate --strict skills
claude -p --permission-mode default --plugin-dir . "/hopla:<name> <args>"
```
Run the smoke from a project that does not also load the installed `hopla` plugin, or the installed copy may answer instead.

### 5. Document it
Add it to the right table in `README.md` ("Skills you run yourself" or "Skills that activate on their own") and to `CHANGELOG.md`.

---

## Renaming or removing a skill

- Plugin users get renames and removals through the plugin itself; `cli.js` legacy lists are only for files the old CLI copied into `~/.claude/`.
- Do not delete or rename a public skill in one step: deprecate it first (CLAUDE.md §3 "Deprecating"), remove it one major later.
- Before deleting a skill that another one replaces, run the deduplication check (CLAUDE.md §3).

---

## Validation

- [ ] `npm test` and `claude plugin validate --strict skills` pass
- [ ] `/hopla:<name>` works in the local smoke
- [ ] README and CHANGELOG updated
