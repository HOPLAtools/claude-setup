# Project Review Checklist — @hopla/claude-setup

Applied by the `code-review` skill's checklist pass on every review of this repo (the native review does not read it). Each item comes from a pattern the system reviews found more than once; the rules themselves live in `CLAUDE.md` — this list is what to look for in a diff.

## Completeness of the change (plan incompleteness: 6 occurrences, 04c → 3.2.0)

- [ ] **Dependents of a changed rule:** if the diff changes how something is selected, detected, parsed, named or located, every dependent is updated too — code, docs, tests **and fixtures** (plan fixtures use `PLAN_MD`, never `"x"`).
- [ ] **Renames and moves:** the old names of every renamed or moved file are gone from code and docs (`grep -rn <old-name>`), not only the old directory.
- [ ] **Docs that name a changed file:** a hook, script or skill whose behavior changed is still described correctly in `SECURITY.md`, the README tables and the `CLAUDE.md` architecture tree.
- [ ] **Release files:** a version bump touches `package.json`, `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` together; an open `[Unreleased]` section in `CHANGELOG.md` is folded into the release, never duplicated.
- [ ] **Deprecated items:** no file outside the deprecated item itself, the notifier, README's deprecated table and CHANGELOG recommends a deprecated skill or agent.

## Skills (skills/**/*.md)

- [ ] No placeholder written out in prose — positional (a `$` followed by a digit), the ARGUMENTS one, or a declared named argument — unless the skill means to show the value.
- [ ] Plugin files are referenced as `${CLAUDE_PLUGIN_ROOT}/skills/...` (or `${CLAUDE_SKILL_DIR}/...`), never as repo-relative paths.
- [ ] A skill that reads its own supporting files keeps `allowed-tools: Read`.
- [ ] A skill that launches a Workflow passes the **absolute project root** in `args`, agents `cd` there and use absolute paths, and verify stages check the files exist under that root.
- [ ] No skill writes state under `.claude/` with Write/Edit.
- [ ] Guides stay flat (`skills/guides-<name>/`, `name: guides:<name>`) and manual-only; no nested skill directories.

## Hooks (hooks/*.js)

- [ ] External commands built from file paths run with `execFileSync` (argument array, no shell), with a regression test using a hostile directory name.
- [ ] Per-session files in the temp dir: validated id, written with `O_NOFOLLOW` (or an exclusive `wx` temp file + rename) and mode `0600`; the guard test uses an id like `a.b`.
- [ ] A hook never sets `permissionDecision` unless that is its purpose, and never blocks on malformed input (exit 0, no output).

## Tests and CI

- [ ] New rules get a test written first (RED in the same branch), and phased plans commit no RED test.
- [ ] Hook tests set their own `TMPDIR`; local smokes never load the plugin from the directory they write into, and temp projects never live under `~/.claude/`.
- [ ] Anything a workflow downloads at run time (npx, curl | sh) runs in a job without `id-token: write`.

## Known Anti-Patterns

| Anti-pattern | What to look for | Correct pattern |
|---|---|---|
| Literal placeholder in skill prose | `$1`, the ARGUMENTS placeholder or `$plan` inside explanatory text | Describe it in words |
| Workflow agent writing elsewhere | Relative paths in agent prompts | Absolute root in `args`, verify existence under it |
| Review that misses committed work | `/hopla:code-review` without a target after phase commits | Pass the branch as target |
| Write through a planted symlink | `writeFileSync(tmpPath, …)` without flags | `wx` / `O_NOFOLLOW`, mode `0600` |
| Read-only agent told to save | Agent without Write/Edit whose prompt says "Save … to" | Return the report; the caller saves it |
