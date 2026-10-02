# @hopla/claude-setup — Development Rules

## 1. Core Principles

- `global-rules.md` is a **template** installed to users' `~/.claude/CLAUDE.md` — it is NOT this project's rules
- Since 3.0 everything users invoke is a skill: `skills/<name>/SKILL.md` (`/hopla:<name>`), Markdown files, not scripts. There is no `commands/` directory
- Guides are flat skills `skills/guides-<name>/SKILL.md` with `name: guides:<name>` (invoked as `/hopla:guides:<name>`) and `disable-model-invocation: true` (manual-only since 3.1). Never nest a skill (`skills/<a>/<b>/SKILL.md`): Claude Code does not load it
- `skills/<name>/SKILL.md` is each skill's entry point. A skill may include extra files (e.g. `commit.md`, `pr.md`, `flow-detection.md` in `skills/git/`) that the `SKILL.md` references as workflows or shared libraries
- Shared references across skills: a file inside one skill can be cited by another (e.g. `skills/worktree/SKILL.md` references `../git/flow-detection.md`). Centralize Git Flow, branching, and similar logic in one place and reference it — do not duplicate
- `agents/*.md` are specialized subagent definitions
- `hooks/*.js` are event-driven hooks; `hooks/hooks.json` declares them for the plugin system
- `cli.js` is a single-file Node.js ESM script — keep it that way, no external dependencies
- This repo serves **two distribution channels**: Claude Code plugin (primary) AND npm CLI (global rules only)
- **The GitHub repo MUST be public** — the plugin channel clones it via `/plugin marketplace add`. A private repo makes the plugin install fail silently for anyone outside the org
- Any change to `skills/`, `agents/`, `hooks/`, or `global-rules.md` affects every future user — review carefully before committing
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
skills/              ← All skills: run with /hopla:<name> or auto-triggered (auto-discovered by plugin)
│   ├── guides-<name>/SKILL.md     ← reference guides, name: guides:<name> → /hopla:guides:<name>
│   ├── <name>/SKILL.md            ← required entry point
│   └── <name>/<extra>.md          ← optional workflow or shared-reference files
│                                    e.g. skills/git/{commit.md, pr.md, flow-detection.md}
agents/              ← Subagent definitions (auto-discovered by plugin)
│   └── *.md
hooks/               ← Event hooks (auto-discovered by plugin via hooks.json)
│   ├── hooks.json              ← Plugin hook declarations (uses ${CLAUDE_PLUGIN_ROOT})
│   ├── tsc-check.js            ← PostToolUse records edited TS/JS files; Stop runs tsc -p <nearest tsconfig> once per turn
│   ├── env-protect.js          ← PreToolUse: block dotenv reads (Read/Grep/Edit/Bash); mentions + templates allowed
│   ├── session-prime.js        ← SessionStart: branch + git summary + active plan + compact-snapshot replay (≤1,500 chars)
│   ├── deprecation-notice.js   ← UserPromptSubmit + PreToolUse(Skill|Agent|Task): one notice per session per deprecated item
│   ├── precompact-snapshot.js  ← PreCompact: dump state to .claude/compact-snapshot.json
│   ├── statusline.js           ← Statusline renderer (opt-in via settings.json)
│   └── lib/plans.js            ← shared plans-dir + active-plan helpers (hooks only; cli.js keeps a copy)
package.json         ← npm metadata and version
CLAUDE.md            ← THIS FILE — project dev rules (not installed to users)
README.md            ← Public documentation
```

**Distribution channels:**

| Channel | Install | What it provides |
|---|---|---|
| **Plugin** | `/plugin install hopla@hopla-marketplace` | Skills, agents, hooks |
| **CLI (npm)** | `npm i -g @hopla/claude-setup && hopla-claude-setup` | Global rules (`~/.claude/CLAUDE.md`) + permissions |

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

- Skills, agents, and hooks are **only delivered by the plugin** — the CLI no longer copies them
- **Never create two skills that resolve to the same `/hopla:<name>`** (a `name:` equal to another skill's directory or name). Skills meant only for explicit `/slash` invocation set `disable-model-invocation: true`; the others also auto-trigger from `description` / `when_to_use`
- **Deprecating** a skill or agent: add a first body line `> ⚠️ **Deprecated in X, removed in Y.** Use <replacement> instead.`, an entry in `hooks/deprecation-notice.js`, a row in README's deprecated table, and update `tests/deprecations.test.js`; a deprecation in a release other than 3.0.0 also gets an entry in the notifier's `SINCE` map (the notice names that release). Remove it one major later
- **Deduplication check:** before deleting a command, skill or agent that another file replaces (a command folded into a skill, a deprecated skill covered by another), diff the two and move into the survivor every step, flag or behavior only the deleted one has. Then delete it. In system-audit-v2 the git commit command was dropped for the skill and its Version Bump step and PR suggestion were nearly lost
- `hooks/hooks.json` uses `${CLAUDE_PLUGIN_ROOT}` paths for the plugin channel
- When removing an installed artifact (command, skill, agent, hook, permission) in a new version, add its old name/path to the legacy cleanup lists in `cli.js` so existing users get it cleaned on next `install` / `--migrate` / `--uninstall`

---

## 4. Code Style

### JavaScript (cli.js)
- ESM only — `import`/`export`, never `require()`
- Node.js built-ins only — never add external packages
- All logic stays in a single file

### Hooks (hooks/*.js)
- Per-session files in the temp dir (markers, records): validate the session id (`^[A-Za-z0-9_-]{1,128}$`) before it reaches a path, write with `O_NOFOLLOW` and mode `0600`, and test the guard with an id that would otherwise be a valid file name (`a.b`), not only with `../x` (which fails for unrelated reasons)
- A hook that runs an external command built from file paths uses `execFileSync` (argument array, no shell) and has a regression test with a hostile directory name (spaces, quotes, `$(…)`, `;`) — the 2.2 code review found a shell injection in `tsc-check`

### Skill files (skills/**/*.md)

- Directory: `skills/[kebab-case-name]/SKILL.md` with `name: [kebab-case-name]` — the plugin namespaces it as `/hopla:[name]`; extra files next to `SKILL.md` are workflows or shared references
- Reference plugin files as `${CLAUDE_PLUGIN_ROOT}/<path>`: Claude Code substitutes it when the skill renders (`${CLAUDE_SKILL_DIR}` too) (verified in the 2.2 smokes)
- Never write a placeholder in skill prose — a positional one (a `$` followed by a digit), the ARGUMENTS one, or a declared named argument — not even as an example: Claude Code substitutes them anywhere in the body when the skill renders. Describe them in words; write them out only where the skill means to show the value (`tests/frontmatter.test.js` lists those skills)
- A skill that reads its own supporting files (`${CLAUDE_SKILL_DIR}/...`, outside the user's project) keeps `allowed-tools: Read` (plus what else it needs): the field does not restrict tools, but without it those reads need approval and are denied in headless runs
- A skill that launches a Workflow passes the absolute project root (`git rev-parse --show-toplevel`) in `args`; every agent prompt `cd`s there and uses absolute paths, and verify stages check the files exist under that root — workflow agents may start in another directory
- What the user must read before an approval dialog goes into the dialog itself (e.g. the Workflow script's `meta.description`, which the dialog shows), not only into an instruction to "say it first": models may put that line in their reasoning, where the user cannot see it (3.3.2 smoke)
- Never make a skill write state under `.claude/` with Write/Edit: Claude Code asks for approval on every such write and refuses it in headless runs, even with `permissions.allow`. Hooks may write there (they are not tools); tool-written state goes under `.agents/` and is git-ignored (e.g. `.agents/hopla-active-plan.json`)

---

## 5. Testing

Automated unit + integration tests run via Node's built-in `node:test` runner (no external test framework — same "Node built-ins only" rule as `cli.js`). The CI workflow at `.github/workflows/ci.yml` runs them on every PR and push to `main`.

```bash
npm test                             # full suite (cli.js helpers, plans parity, frontmatter, hook scripts)
node --test tests/cli.test.js        # one file
bash skills/hook-audit/tests/manual-test.sh   # the hook-audit smoke
```

**Changes to the code-review skill are dogfooded:** before the PR, review the branch with the branch's own plugin. Load it from **another copy** (`git worktree add ../claude-setup-dogfood <branch>`) and run in this repo `claude -p --settings '{"enabledPlugins":{"hopla@hopla-marketplace":false}}' --plugin-dir ../claude-setup-dogfood "/hopla:code-review <branch>"`, or run interactively and approve the report write.

**Workflow features in local tests:** the Workflow tool always asks for approval ("Review dynamic workflow before running"), so headless runs refuse it except in `bypassPermissions` — use bypass only to check the mechanics, and check the approve and decline paths interactively.

**Protected paths in local tests:** Claude Code protects the directory loaded with `--plugin-dir` (it reloads and runs the plugin's code when a file there changes) and everything under `~/.claude/`. Writes there ask for approval in `default`/`acceptEdits` and are refused headless ("sensitive file"). So headless tests that write into this repo load the plugin from another copy, and temp test projects never live under `~/.claude/` (use the session scratchpad or `/private/tmp`).

**Plan fixtures must be real plans.** In `plans-parity`, `cli`, `session-prime` and `precompact-snapshot` tests, write plan files with the file's `PLAN_MD` constant (it has `## Implementation Tasks`), never `"x"`: the active-plan mtime fallback skips files without a task heading, so a placeholder fixture silently stops being a plan.

Tests live in `tests/`:

```
tests/
├── cli.test.js                     parseSettingsFile + safeWrite + status/plans-dir + CLI integration tests
├── plans-parity.test.js            cli.js copy == hooks/lib/plans.js (plans dir, pointer, active plan)
├── frontmatter.test.js             skill/guide/agent frontmatter rules (forks, models, manual-only, arguments)
├── layout.test.js                  commands/ gone, no nested skills, no stale commands/ paths
├── deprecations.test.js            banners, notifier entries, nothing recommends a deprecated item
├── git-skill.test.js               git skill honors standing approvals; merging stays manual
├── plan-feature.test.js            plan-feature keeps the dependents-grep, verification-spike and migration-plan rules
├── init-project.test.js            init-project: native /init for existing code, alias, never overwrites
├── execute.test.js                 execute Step 4a: independent tasks as a workflow, sequential fallbacks
├── review-checklist.test.js        this repo's .agents/guides/review-checklist.md covers the recurring patterns
├── review-plan.test.js             review-plan completeness check (dependents, spikes, tests per commit, human check, [Unreleased])
├── code-review.test.js             review always saved to .agents/code-reviews/<plan-slug>.md; read-only agents never told to save
├── helpers/fixtures.js             tempdir, JSON/text I/O, frontmatter reader, cleanup helpers
└── hooks/
    ├── env-protect.test.js         dotenv reads blocked, mentions and templates allowed (table-driven)
    ├── tsc-check.test.js           PostToolUse recorder + Stop check (nearest tsconfig, own vs other errors, loop guard)
    ├── session-prime.test.js       minimal SessionStart output + snapshot replay
    ├── precompact-snapshot.test.js snapshot keys + round trip into session-prime
    └── deprecation-notice.test.js  one notice per session per item, never blocks, registered for both events
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
npm publish --otp=<code> # Manual fallback only — merging a version bump to main publishes automatically (publish.yml)
```

**Release flow:**

1. Bump version in `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (must match — `scripts/check-versions.js` runs as `prepublishOnly` and blocks publish if they diverge)
2. `git commit` + open PR
3. **Verify CI is green** on the PR before merging (`.github/workflows/ci.yml` runs JSON validation, `check-versions`, `npm test`, CLI dry-runs, and `hook-audit/tests/manual-test.sh` on Node 20 and 24)
4. Merge PR to `main`
5. **Publishing is automatic.** `.github/workflows/publish.yml` runs on every push to `main`: if the `package.json` version is not on npm yet, it repeats the CI checks and runs `npm publish` (which runs `prepublishOnly`) with npm trusted publishing (OIDC, no stored token, provenance included); otherwise it ends green doing nothing. It only affects the CLI channel — the plugin channel is updated by Claude Code reading the git repo. Never rename `publish.yml`: npmjs.com trusts that exact filename. Anything `publish.yml` downloads at run time (npx, curl | sh) runs in its own job with `contents: read` (see `validate-plugin`); never give such a step `id-token: write`. Manual fallback: `npm publish --otp=<code>` from `main`.
   To confirm a release, poll the registry until it answers 200 (about a minute after the publish log shows `+ @hopla/claude-setup@<version>`; `npm view` may still report the previous `latest` before that), then check `latest`:
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' https://registry.npmjs.org/@hopla%2Fclaude-setup/<version>
   npm view @hopla/claude-setup version --prefer-online
   ```
6. Plugin-channel users with auto-update enabled get the new version at next session start, automatically. Users without auto-update refresh via:
   ```
   /plugin marketplace update hopla-marketplace
   /plugin disable hopla@hopla-marketplace
   /plugin enable hopla@hopla-marketplace
   /reload-plugins
   ```
   In commit messages and release notes, reference this canonical flow — **do not** repeat the old `cd … && git pull` dance.

**Committing part of a file** (a file edited by more than one phase): stage hunks with context (`git diff -U3 <file>` → edit the patch → `git apply --cached`), never `--unidiff-zero`, which can drop hunks in the wrong place. Before committing, check the staged snapshot with `git checkout-index -a --prefix=<tmp>/` and run the tests there.

---

## 7. Task-Specific Reference Guides

**When adding a new skill:**
Read: `.agents/guides/add-skill.md`
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
