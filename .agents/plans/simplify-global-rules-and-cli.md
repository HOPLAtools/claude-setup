# Plan: Simplify global-rules.md and CLI distribution

## Overview
Remove ~40% redundant content from `global-rules.md` that plugin skills/hooks already enforce, and refactor `cli.js` to stop duplicating what the plugin provides (commands, skills, agents, hooks). The CLI becomes a lightweight "first-time setup" tool for the two things the plugin cannot do: install global rules and configure permissions.

## Requirements Summary
- Slim `global-rules.md`: remove Git Flow details, Conventional Commits examples, validation pyramid details, and HOPLA commands list — all already covered by skills/hooks
- Keep only rules that shape base behavior (language, preferences, autonomy, proactive suggestions)
- Refactor `cli.js` to only install `global-rules.md` + permissions — stop copying commands, skills, agents, hooks
- Fix `session-prime.js` stale hardcoded skills list (missing worktree, parallel-dispatch, subagent-execution)
- Remove `--planning` mode from CLI (all content delivery now via plugin)
- Update README.md to reflect new channel responsibilities

## Out of Scope
- Changing the plugin system itself (plugin.json, marketplace.json)
- Adding new skills or commands
- Changing hook behavior (tsc-check, env-protect logic)
- Version bump (will be done at publish time)

## Likely Follow-ups
- Deprecate CLI entirely once plugin can write to `~/.claude/CLAUDE.md` (if ever)
- Auto-discover skills in `session-prime.js` instead of hardcoding
- Add a hook to intercept `npm install`/`pip install` (currently only enforced by CLAUDE.md rule)

## Git Strategy
- **Base branch:** `main`
- **Feature branch:** `feature/simplify-global-rules-and-cli`

## Context References
Key files the executing agent must read before starting:
- `global-rules.md` — the template to slim down (148 lines → target ~90 lines)
- `cli.js` — the CLI to refactor (543 lines → target ~200 lines)
- `hooks/session-prime.js` — fix stale skills list (63 lines)
- `skills/git/commit.md` — already has full Conventional Commits + branch strategy
- `skills/git/pr.md` — already has full Git Flow/GitHub Flow detection
- `skills/verify/SKILL.md` — already has validation pyramid
- `hooks/hooks.json` — confirms plugin already declares all 3 hooks
- `README.md` — needs channel documentation update
- `.agents/guides/modify-cli.md` — guide for CLI changes

## Implementation Tasks

### Task 1: Slim down global-rules.md
- **Action:** modify
- **File:** `global-rules.md`
- **Pattern:** N/A
- **Details:**
  1. **Section 4 (Git Workflow):** Replace the 40+ lines of branch strategy details + Conventional Commits examples with a 3-line summary: "Follow Conventional Commits (`type(scope): description`). Branch strategy (GitHub Flow vs Git Flow) is auto-detected by the git skill. See the git skill for full details."
  2. **Section 5 (Code Quality):** Replace validation pyramid detail with: "Validate before declaring done (lint → types → tests). The verify skill enforces this at completion."
  3. **Section "Available HOPLA Commands":** Replace the hardcoded command list with: "HOPLA skills are auto-triggered based on context. The session-prime hook lists available skills at the start of each session. Use `/hopla-plan-feature` to start the full workflow."
  4. **Keep intact:** Sections 1 (Communication), 2 (Tech Preferences), 3 (Behavior & Autonomy), Context Management, MCP Servers placeholder
  5. Target: ~90 lines (from 148)
- **Gotcha:** This file is a TEMPLATE that gets installed to users' `~/.claude/CLAUDE.md`. Existing users won't get the update unless they run `claude-setup --force` again. The README should note this.
- **Validate:** Read the resulting file and verify no essential-only-in-CLAUDE.md rules were removed

### Task 2: Refactor cli.js — remove command/skill/agent/hook copying
- **Action:** modify
- **File:** `cli.js`
- **Pattern:** `.agents/guides/modify-cli.md`
- **Details:**
  1. Remove `installSkills()` function entirely
  2. Remove `installAgents()` function entirely
  3. Remove `installHooks()` function entirely (plugin's `hooks.json` handles this)
  4. Remove command installation loop from `install()` (plugin auto-discovers `commands/`)
  5. Remove `removeStaleCommands()` function (no longer needed)
  6. Remove `withPrefix()` function (no longer needed)
  7. Remove `PLANNING_COMMANDS`, `PLANNING_SKILLS`, `PLANNING_PERMISSIONS` constants
  8. Remove `--planning` flag support
  9. Keep: `install()` with only global-rules.md copy + `setupPermissions()`
  10. Keep: `uninstall()` but simplify to only remove `~/.claude/CLAUDE.md` and hopla permissions from settings.json
  11. Keep: `--force`, `--uninstall`, `--version` flags
  12. Add: detection message — if plugin is installed, tell user "Plugin detected — commands, skills, and hooks are managed by the plugin. This CLI only installs global rules and permissions."
- **Gotcha:** The `uninstall()` function currently removes skills/agents/hooks dirs. After this change, `uninstall()` should ALSO clean up legacy files from old CLI installs (skills/commands in `~/.claude/`) to help users migrate.
- **Validate:** `node cli.js --force` should only install `~/.claude/CLAUDE.md` and update permissions. Verify no files created in `~/.claude/commands/`, `~/.claude/skills/`, `~/.claude/hooks/`, `~/.claude/agents/`.

### Task 3: Fix session-prime.js stale skills list
- **Action:** modify
- **File:** `hooks/session-prime.js`
- **Pattern:** N/A
- **Details:**
  1. Replace hardcoded skills list with auto-discovery: read `skills/` directory from the hook's own location (`import.meta.dirname` or `${CLAUDE_PLUGIN_ROOT}`)
  2. For each skill directory found, read its `SKILL.md` frontmatter or first line to extract the description
  3. Fallback: if auto-discovery fails (e.g., running from CLI install), use a minimal message: "HOPLA skills are available. Check available skills in your session."
  4. Keep the "If a skill applies to your current task, you MUST use it" reminder
- **Gotcha:** The hook runs from two contexts: plugin root (`${CLAUDE_PLUGIN_ROOT}/hooks/`) and CLI-installed (`~/.claude/hooks/`). The relative path to `skills/` differs. Use `import.meta.dirname` to resolve relative to the script, then check `../skills/` (plugin context). If not found, the hook is running from CLI context where skills aren't copied anymore — use fallback.
- **Validate:** Run `node hooks/session-prime.js` from the repo root and verify it lists all skills including worktree, parallel-dispatch, subagent-execution

### Task 4: Update README.md channel documentation
- **Action:** modify
- **File:** `README.md`
- **Pattern:** N/A
- **Details:**
  1. Update the installation section to clarify:
     - **Plugin (recommended):** delivers commands, skills, agents, hooks — the primary channel
     - **CLI (optional, one-time):** only installs `~/.claude/CLAUDE.md` global rules and bash permissions
  2. Remove the "CLI installs commands" narrative — it no longer does
  3. Update the "What's included" table to reflect new channel responsibilities
  4. Add a migration note: "If you previously used the CLI and now have the plugin, run `node cli.js --uninstall` to remove duplicate files, then reinstall with `node cli.js --force` to get only global rules."
  5. Remove `--planning` documentation
- **Gotcha:** N/A
- **Validate:** Read README.md and verify channel descriptions are accurate

### Task 5: Update CLAUDE.md project rules
- **Action:** modify
- **File:** `CLAUDE.md`
- **Pattern:** N/A
- **Details:**
  1. Update Architecture section to reflect that CLI no longer installs commands/skills/agents/hooks
  2. Update the CLI install flow diagram to show only: `create ~/.claude/ dirs → install global-rules.md → setupPermissions()`
  3. Update Development Commands section (remove `--planning`)
  4. Update distribution channel table
- **Gotcha:** This is the PROJECT's rules file, not the user template. Don't confuse with `global-rules.md`.
- **Validate:** Read CLAUDE.md and verify architecture description matches new CLI behavior

### Task 6: Legacy cleanup in uninstall
- **Action:** modify
- **File:** `cli.js`
- **Pattern:** N/A
- **Details:**
  1. In the simplified `uninstall()`, add cleanup of legacy CLI-installed files:
     - Remove any `hopla-*` files in `~/.claude/commands/`
     - Remove any `hopla-*` directories in `~/.claude/skills/`
     - Remove hopla hook entries from `~/.claude/settings.json` (PostToolUse tsc-check, PreToolUse env-protect, SessionStart session-prime with absolute paths)
     - Remove hook files from `~/.claude/hooks/` (tsc-check.js, env-protect.js, session-prime.js)
  2. Keep removing `~/.claude/CLAUDE.md`
  3. Add a `--migrate` flag that only removes legacy duplicates without touching CLAUDE.md
- **Gotcha:** Be careful not to remove non-hopla hooks or skills from `~/.claude/`. Only target `hopla-*` prefixed items and known hopla hook commands.
- **Validate:** Run `node cli.js --uninstall` and verify it removes legacy files but doesn't touch non-hopla content

## Test Tasks

### Task 7: Manual testing checklist
- **Action:** N/A (manual verification)
- **File:** N/A
- **Pattern:** N/A
- **Details:**
  1. `node cli.js --version` — prints version
  2. `node cli.js --force` — only installs CLAUDE.md + permissions, no commands/skills/agents/hooks
  3. `node cli.js --uninstall` — removes CLAUDE.md, legacy hopla files, and hopla permissions
  4. `node cli.js --migrate` — removes only legacy duplicate files
  5. Verify `~/.claude/commands/` has no `hopla-*` files after migrate
  6. Verify `~/.claude/skills/` has no `hopla-*` directories after migrate
  7. Run `node hooks/session-prime.js` from repo root — lists all current skills
  8. Verify `global-rules.md` is ~90 lines and contains no redundant git/commit details
- **Gotcha:** N/A
- **Validate:** All 8 checks pass

## Validation Checklist

- [ ] **Level 1 — Lint & Format:** No linter configured — visual review for code style consistency
- [ ] **Level 2 — Type Check:** N/A (plain JavaScript)
- [ ] **Level 2.5 — Code Review:** Run `/hopla-code-review` on changed files
- [ ] **Level 3 — Unit Tests:** N/A (no test framework)
- [ ] **Level 4 — Integration Tests:** Manual testing per Task 7
- [ ] **Level 5 — Human Review:** Verify `global-rules.md` kept all essential rules, verify CLI behavior

## Acceptance Criteria
- [ ] `global-rules.md` is ≤100 lines with no content duplicated by skills/hooks
- [ ] `cli.js` does NOT install commands, skills, agents, or hooks
- [ ] `cli.js` DOES install `~/.claude/CLAUDE.md` and configure permissions
- [ ] `cli.js --uninstall` cleans up legacy files from old CLI installs
- [ ] `cli.js --migrate` removes only duplicate files without touching CLAUDE.md
- [ ] `session-prime.js` auto-discovers skills (no hardcoded list)
- [ ] README.md clearly distinguishes plugin (primary) vs CLI (one-time setup) channels
- [ ] No `--planning` flag or related code remains in CLI

## Confidence Score: 8/10

- **Strengths:** Clear separation of concerns, all files identified, no external dependencies to worry about, simple JavaScript changes
- **Uncertainties:** `session-prime.js` auto-discovery path resolution between plugin and CLI contexts; `--migrate` flag UX (will users know to use it?)
- **Mitigations:** Fallback message if auto-discovery fails; README migration guide; `--uninstall` also handles legacy cleanup as safety net

## Notes for Executing Agent
- Read `.agents/guides/modify-cli.md` before touching `cli.js`
- The `global-rules.md` changes affect ALL future CLI users — review the slim version carefully
- `session-prime.js` runs in two contexts (plugin root vs `~/.claude/hooks/`). Test BOTH paths.
- Don't bump version — that happens at publish time per `.agents/guides/publish-npm.md`
- The deleted code from `cli.js` is substantial (~300 lines). Make sure the remaining ~200 lines are clean and well-structured.
