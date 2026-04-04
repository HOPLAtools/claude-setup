# Plan: System Audit V2 — Improvements from Real-World Usage

## Overview
Apply system-wide improvements to @hopla/claude-setup based on an audit of 21 system reviews + 13 execution reports from a real-world project (SheetCompare). All improvements are generic — they apply to any project using the system. Key changes: unify git skill/command duplication, strengthen planning and execution with evidence-based prevention, improve code review categories, close the feedback loop in system reviews, and clean up deprecated components.

## Requirements Summary
- Unify git skill and git commands into a single source of truth (skill as canonical)
- Add evidence-based improvements to plan-feature (verify assumptions, role matrix, integration buffer, UI budget, N+1 checklist, consult previous reports)
- Strengthen execute with concrete verification, anti-destructive rule, and aggressive commit strategy
- Expand code-review categories (N+1, multi-user auth, React dependency arrays)
- Close the feedback loop in system-reviewer agent (detect recurring recommendations)
- Make execution-report patterns more prescriptive for CLAUDE.md flow
- Add divergence documentation check to verify skill
- Integrate debug → rca and brainstorm → create-prd
- Deprecate end-to-end command
- Fix planning mode subset in cli.js
- Update README to reflect all changes
- Add missing YAML frontmatter and language headers for consistency

## Out of Scope
- Changes to hooks (tsc-check.js, env-protect.js, session-prime.js) — working well
- Changes to global-rules.md — affects all users, needs separate review
- Project-specific patterns (AG Grid, Durable Objects, buyer/org context) — those belong in project CLAUDE.md, not the system
- New commands or skills — only modifying existing ones
- cli.js logic changes beyond planning mode subset and stale command cleanup

## Likely Follow-ups
- Adding framework-specific review checklist templates (React, Hono, etc.)
- Creating a "system health" command that aggregates system review trends
- Adding a `--review` flag to cli.js that validates installed files match source

## Git Strategy
- **Base branch:** `main`
- **Feature branch:** `feature/system-audit-v2`

## Context References
Key files the executing agent must read before starting:
- `commands/plan-feature.md` — 250 lines, the planning command (Phase 2-4 and Phase 6 need additions)
- `commands/execute.md` — 208 lines, the execution command (Step 1 and Step 4 need additions)
- `skills/code-review/SKILL.md` — 98 lines, code review skill (Step 3 needs expanded categories)
- `agents/system-reviewer.md` — 64 lines, system reviewer agent (needs feedback loop closure)
- `skills/execution-report/SKILL.md` — 119 lines, execution report skill (Technical Patterns section needs strengthening)
- `skills/verify/SKILL.md` — 65 lines, verify skill (needs divergence check)
- `skills/git/SKILL.md` — 27 lines, git skill router
- `skills/git/commit.md` — 59 lines, skill's commit workflow (needs Version Bump from command)
- `skills/git/pr.md` — 131 lines, skill's PR workflow (needs dev/main sync note from command)
- `commands/git-commit.md` — 77 lines, command version (TO BE DELETED after merging into skill)
- `commands/git-pr.md` — 139 lines, command version (TO BE DELETED after merging into skill)
- `commands/end-to-end.md` — 68 lines (TO BE DELETED — deprecated)
- `commands/rca.md` — 65 lines, RCA command (needs frontmatter + language header)
- `skills/debug/SKILL.md` — 74 lines (needs RCA integration at end)
- `skills/brainstorm/SKILL.md` — 90 lines (needs create-prd reference)
- `commands/validate.md` — 76 lines (needs verify skill reference)
- `cli.js` — 543 lines (PLANNING_COMMANDS needs update)
- `README.md` — 360 lines (needs updates for removed commands, updated workflow)
- `CLAUDE.md` — project dev rules (reference for architecture constraints)

## Phase Boundaries

- **Phase A (Tasks 1-3):** Git unification + deprecation → commit after completing
- **Phase B (Tasks 4-8):** Core skill/command improvements → commit after completing
- **Phase C (Tasks 9-11):** Integration, consistency, documentation → commit after completing

## Implementation Tasks

> All fields are required. Use `N/A` if a field does not apply — never leave a field blank.

---

### Task 1: Merge git command extras into git skill files

- **Action:** modify
- **File:** `skills/git/commit.md`
- **Pattern:** `commands/git-commit.md` — the command has two features the skill lacks
- **Details:**
  1. Add a new **Step 5: Version Bump (if configured)** between current Step 5 (Execute Commit) and Step 6 (Push Reminder). Copy the exact content from `commands/git-commit.md` lines 49-57:
     ```markdown
     ## Step 5: Version Bump (if configured)

     Before committing, check the project's `CLAUDE.md` for a `## Versioning` section. If it exists:

     1. Read the versioning configuration (command, trigger, files)
     2. Check if the **trigger condition** matches (e.g., specific branches, always, etc.)
     3. If it matches, run the version bump command
     4. Stage the version files alongside the other changes

     If no `## Versioning` section exists in the project's `CLAUDE.md`, skip this step entirely.
     ```
     Renumber existing Step 5 → Step 6 and Step 6 → Step 7.
  2. Add the PR suggestion to the end of the new Step 7 (Push Reminder), after the push confirmation line:
     ```markdown

     If the user confirms the push (or if the branch was already pushed), suggest:
     > "Ready to create a Pull Request? Run `/hopla-git-pr` to create one."
     ```
- **Gotcha:** The skill's commit.md has no YAML frontmatter (it's a sub-file of the git skill, not a standalone skill). Don't add frontmatter.
- **Validate:** Read the file and confirm Steps 1-7 exist, with Version Bump at Step 5 and PR suggestion at end of Step 7

### Task 2: Merge git-pr command extras into git skill PR file

- **Action:** modify
- **File:** `skills/git/pr.md`
- **Pattern:** `commands/git-pr.md` — the command has two extras the skill lacks
- **Details:**
  1. In Step 6, after "**Never merge automatically** — the PR is for human review.", add:
     ```markdown

     After showing the PR URL, suggest:
     > "PR created. To complete the cycle, run `/hopla-execution-report` (if not done yet) and `/hopla-system-review` after the PR is merged."
     ```
  2. In Step 7 (Post-Merge Cleanup), in the "For all branch types" section, after the cleanup commands, add the note from the command version:
     ```markdown

     **Important:** When `dev` is merged to `main` via PR, do NOT pull `main` back into `dev` — `dev` already has all the commits. Only sync `main` → `dev` for hotfix/release branches (see below).
     ```
- **Gotcha:** The skill's pr.md also has no YAML frontmatter. Don't add one.
- **Validate:** Read the file and confirm both additions exist

### Task 3: Delete duplicate commands, deprecate end-to-end, update cli.js

- **Action:** delete + modify
- **File:** `commands/git-commit.md`, `commands/git-pr.md`, `commands/end-to-end.md`, `cli.js`
- **Pattern:** N/A
- **Details:**
  1. Delete `commands/git-commit.md`
  2. Delete `commands/git-pr.md`
  3. Delete `commands/end-to-end.md`
  4. In `cli.js`, update `PLANNING_COMMANDS` (line 171-179) — remove `"git-commit.md"` and `"git-pr.md"`, add `"system-review.md"` and `"rca.md"`:
     ```javascript
     const PLANNING_COMMANDS = [
         "init-project.md",
         "create-prd.md",
         "plan-feature.md",
         "review-plan.md",
         "system-review.md",
         "rca.md",
         "guide.md",
     ];
     ```
  5. In `cli.js`, update `PLANNING_SKILLS` (line 260) — add `"git"` so planners can still trigger commits via the skill if needed (the skill asks for confirmation):
     ```javascript
     const PLANNING_SKILLS = ["prime", "brainstorm", "git"];
     ```
- **Gotcha:** The `removeStaleCommands()` function (line 150) automatically cleans up any `hopla-*` command files not in the current source. Since we're deleting git-commit.md, git-pr.md, and end-to-end.md from source, the next `cli.js --force` install will auto-remove them from `~/.claude/commands/`. No need to add to a LEGACY_FILES list — the cleanup is already automatic.
- **Validate:** Confirm the 3 command files are deleted. Run `node cli.js --force` and verify no errors. Verify the output does NOT list `hopla-git-commit`, `hopla-git-pr`, or `hopla-end-to-end`.

---

### Task 4: Add evidence-based improvements to plan-feature

- **Action:** modify
- **File:** `commands/plan-feature.md`
- **Pattern:** N/A — follow existing bullet style in Phase 2, 3, 4, and 6
- **Details:**
  1. **Phase 2** (line 30, after item 5 about MEMORY.md): Add item 6:
     ```markdown
     6. `.agents/execution-reports/` — if this directory exists, scan recent reports (last 3-5) for technical patterns discovered and gotchas relevant to the feature being planned. These contain real-world learnings from previous implementations that prevent re-discovering known issues.
     ```

  2. **Phase 3** (line 53, after "Read the key files in their entirety"): Add a new subsection before "### Data audit":
     ```markdown

     ### Assumption verification (required)

     For each existing table, API endpoint, or component the plan will modify, verify the current state during planning — do not defer to execution:
     - **Database/schema:** Read the most recent migration or schema definition. Confirm column names, types, and constraints match your assumptions.
     - **API endpoints:** Read the actual route handler. Confirm the request/response shape matches your assumptions.
     - **Components:** Read the component file. Confirm props, state, and data flow match your assumptions.

     Document verified assumptions in the plan's **Context References** with the exact file and line number. This prevents the #1 cause of mid-implementation redesigns: plans that assumed a field name, type, or constraint that didn't match reality.
     ```

  3. **Phase 4** (line 79, after the API surface enumeration bullet): Add 3 new bullets:
     ```markdown
     - **Role access matrix:** For features involving multiple user roles or multi-tenant access (admin, member, viewer, buyer, external user), define a matrix: what data does each role see? What endpoints does each role call? What filters apply per role? In past implementations, plans that didn't specify role-level access had authorization bugs discovered only during code review.
     - **External integration buffer:** If the feature integrates an external API or third-party service, budget 2x the estimated time. Document: do we have working test credentials? Is the SDK tested in our runtime (Workers, Node, edge, etc.)? Are there known deprecations or version constraints? External integrations consistently took 2-3x longer than planned in past implementations.
     - **UI iteration budget:** For features with significant UI (new pages, complex forms, interactive grids), note that UI specifications are provisional — expect 30-50% additional work for visual refinement based on user feedback. Specify what "good enough for v1" looks like vs. future polish. This prevents scope creep from being classified as plan failure.
     ```

  4. **Phase 6** (line 220, after the last verification item about API surface enumeration): Add 1 new item:
     ```markdown
     - [ ] **N+1 query check:** For every task that writes database queries or API calls, verify: is any call inside a loop? Could it be batched? Are there duplicate existence checks before mutations? N+1 queries were found in 5 of 13 recent implementations.
     ```
- **Gotcha:** All additions are appended to existing sections — do not reorder or modify existing content. Phase 4 bullets should maintain the same indentation level as existing bullets.
- **Validate:** Read the file and confirm: Phase 2 has item 6 about execution reports, Phase 3 has "Assumption verification" subsection before "Data audit", Phase 4 has 3 new bullets at the end, Phase 6 has the N+1 item at the end

### Task 5: Strengthen execute command

- **Action:** modify
- **File:** `commands/execute.md`
- **Pattern:** N/A — follow existing style
- **Details:**
  1. **Step 1** (line 30, after "See `.agents/guides/data-audit.md` for detailed criteria on what to check."): Add a concrete verification instruction:
     ```markdown

     **Concrete verification:** For each table or API endpoint mentioned in the plan's tasks, run ONE verification command before writing code. Examples:
     - Schema: `grep -n 'CREATE TABLE\|ALTER.*tablename' migrations/*.sql | tail -3`
     - API route: Read the route file and confirm the endpoint signature
     - Component: Read the component and confirm its props interface

     If ANY assumption from the plan doesn't match current code, file a Blocker Report immediately. Do not proceed with tasks that depend on incorrect assumptions.
     ```

  2. **Step 4** (line 108, after "Do not improvise silently. When in doubt, stop and ask."): Add anti-destructive rule before the Scope Guard:
     ```markdown

     ### Destructive Command Guard

     **NEVER** run destructive database or state commands during plan execution:
     - `db:reset`, `db:push --force`, `DROP TABLE`, `DELETE FROM` without WHERE
     - `rm -rf` on data directories
     - `git reset --hard`, `git clean -fd`

     If a migration fails or data needs to be reset, **stop and report to the user**. The cost of pausing is low; the cost of data loss is catastrophic. This rule exists because a `db:reset` during execution caused complete local data loss in a past implementation.
     ```

  3. **Step 4** (line 100, the commit strategy section): After "Use commit message format: `feat(<scope>): <feature> — phase N of M`", add:
     ```markdown
     For plans with 8+ tasks, the **first intermediate commit** should happen after the first 3-4 tasks pass validation — do not wait until a full phase boundary if one isn't defined. Losing work on large implementations was a recurring problem when commits were deferred too long.
     ```
- **Gotcha:** The Destructive Command Guard should go BEFORE the Scope Guard section (line 110), not after it. Place it between "Do not improvise silently" and "### Scope Guard".
- **Validate:** Read Step 1 and confirm concrete verification paragraph exists. Read Step 4 and confirm Destructive Command Guard exists before Scope Guard. Read commit strategy and confirm early commit guidance exists.

### Task 6: Expand code-review skill categories

- **Action:** modify
- **File:** `skills/code-review/SKILL.md`
- **Pattern:** N/A — follow existing category format
- **Details:**
  1. **Section 2 (Security Issues)** (line 46, after "XSS vulnerabilities (frontend)"): Add:
     ```markdown
     - Multi-user authorization context — for multi-tenant apps, verify each endpoint filters by the correct context (e.g., active org vs personal org, admin vs viewer). Check that middleware/auth guards match the intended audience for each route
     ```

  2. **Section 3 (Performance Problems)** (line 50, replace the existing "N+1 queries or redundant API calls" line): Replace with a more specific version:
     ```markdown
     - N+1 queries — database queries or API calls inside loops (`for`, `.map`, `.forEach`), duplicate existence checks before mutations, sequential operations that could use `Promise.all()` or batch SQL. This was found in 5 of 13 recent implementations
     ```

  3. **Section 1 (Logic Errors)** (line 39, after "Side effects inside JSX render"): Add:
     ```markdown
     - Stale dependency arrays — for every new `useState`/`useRef` variable introduced in the diff, verify it appears in the dependency arrays of `useEffect`, `useCallback`, or `useMemo` that reference it. Missing deps cause stale closures — this was the #1 React bug category across 28 implementations
     ```
- **Gotcha:** The N+1 line replacement (item 2) must replace the existing line exactly, not add a duplicate. Use the Edit tool's `old_string` with the exact current text.
- **Validate:** Read Step 3 and confirm all 3 additions exist in their respective categories

### Task 7: Close the feedback loop in system-reviewer agent

- **Action:** modify
- **File:** `agents/system-reviewer.md`
- **Pattern:** N/A — follow existing markdown structure
- **Details:**
  1. Add a new step between step 5 and step 6 in "Your Process":
     ```markdown
     5.5. **Check recommendation history** — Read the 3 most recent system reviews in `.agents/system-reviews/`. If a recommendation appears in 2+ previous reviews and hasn't been applied, flag it as **RECURRING — NOT APPLIED** with escalation priority.
     ```

  2. Add a new section to the Output Format template, after "## Key Learnings":
     ```markdown

     ## Recommendation Tracking

     For each recommendation from the 2 most recent system reviews:
     - Was it applied? (Check CLAUDE.md, commands, guides for the suggested change)
     - If not applied, why? (Forgotten, deprioritized, or superseded?)
     - **Recurring unapplied recommendations indicate a broken feedback loop** — escalate these by listing them first in "Recommended Improvements" with a ⚠️ prefix

     ## Next Step

     After the review is saved, suggest:
     > "System review saved to `.agents/system-reviews/[feature]-review.md`. Plan archived. If recurring recommendations were found, consider applying them before the next feature — they represent known gaps in the process."
     ```
- **Gotcha:** The system-reviewer is an agent definition (agents/system-reviewer.md), not a command. It uses the same frontmatter format but is invoked differently. The command `commands/system-review.md` already handles cross-review detection (Step 5.5) — this change adds the tracking OUTPUT to the agent's template so the information is actually saved.
- **Validate:** Read the file and confirm step 5.5 exists and the "Recommendation Tracking" + "Next Step" sections exist in the output template

### Task 8: Strengthen execution-report and verify skills

- **Action:** modify
- **File:** `skills/execution-report/SKILL.md`, `skills/verify/SKILL.md`
- **Pattern:** N/A
- **Details:**
  1. **execution-report** (line 104, replace the "Suggested documentation" field): Replace:
     ```
     - **Suggested documentation:** [which file should capture this: CLAUDE.md, `.agents/guides/review-checklist.md`, or a new guide]
     ```
     With a more prescriptive version:
     ```
     - **Ready-to-paste CLAUDE.md entry:** [Write the EXACT text that should be added to the project's CLAUDE.md to prevent this gotcha in future features. Format it as a bullet point under the appropriate section. If it belongs in a guide instead, write the exact text for the guide. Do not write vague suggestions like "document this" — write the actual content so the system reviewer can apply it directly.]
     ```

  2. **verify** (line 64, at the end of the file): Add a new section:
     ```markdown

     ## Plan Execution Check

     When verifying completion of a plan execution (not just a standalone task):

     1. **Divergences documented?** — Ask: "Were there any tasks added, skipped, or changed from the original plan?" If yes, verify they are documented in the completion report.
     2. **Unplanned files?** — Run `git diff --name-only` and compare against the plan's task list. Flag any files changed that aren't in any task.
     3. **All acceptance criteria met?** — Read the plan's acceptance criteria and verify each one has fresh evidence.

     These checks prevent the common pattern where implementation is "done" but divergences are silently omitted from the report.
     ```
- **Gotcha:** The execution-report edit is a field replacement, not an addition. Use Edit tool carefully to match the exact old string.
- **Validate:** Read execution-report and confirm the "Ready-to-paste" field exists. Read verify and confirm the "Plan Execution Check" section exists at the end.

---

### Task 9: Integrate debug → rca and brainstorm → create-prd

- **Action:** modify
- **File:** `skills/debug/SKILL.md`, `skills/brainstorm/SKILL.md`
- **Pattern:** Follow the "Next Step" pattern used in code-review and execution-report skills
- **Details:**
  1. **debug** (line 73, at the end of the file after "Prevention"): Add:
     ```markdown

     ## Escalation

     If the 3-Strike Rule activates (3 fixes failed), suggest:
     > "This bug may need deeper investigation. Run `/hopla-rca` to produce a structured Root Cause Analysis document with evidence, proposed fix, and prevention steps."

     If the bug is fixed, suggest:
     > "Bug fixed. Run `/hopla-validate` to verify no regressions, then `/hopla-git-commit` to save the fix."
     ```

  2. **brainstorm** (line 89, at the end of Rules section): Add:
     ```markdown

     ## Integration

     - If the user hasn't defined requirements yet, suggest: "Before brainstorming, consider running `/hopla-create-prd` to define the product requirements. This gives us clearer constraints to design against."
     - If the user is brainstorming a bug fix rather than a new feature, suggest: "This sounds like a bug rather than a new feature. Consider running the `debug` skill for systematic root cause analysis instead."
     ```
- **Gotcha:** N/A
- **Validate:** Read debug skill and confirm "Escalation" section exists. Read brainstorm skill and confirm "Integration" section exists.

### Task 10: Add missing frontmatter and language headers

- **Action:** modify
- **File:** `commands/rca.md`, `commands/guide.md`
- **Pattern:** `commands/validate.md` — has proper frontmatter format
- **Details:**
  1. **rca.md** — Add YAML frontmatter and language header at the top (before `# Root Cause Analysis`):
     ```markdown
     ---
     description: Investigate a bug or issue and produce a structured RCA document
     argument-hint: "<issue-description-or-github-url>"
     ---

     > 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

     # Root Cause Analysis
     ```
     Remove the existing first two lines (`# Root Cause Analysis` and the blockquote description).

  2. **guide.md** — Read the file first. If it doesn't have YAML frontmatter, add it following the same pattern. If it doesn't have the language header, add it after the frontmatter.
- **Gotcha:** For rca.md, the existing content starts with `# Root Cause Analysis` on line 1 and a blockquote on line 3. The new frontmatter replaces these with proper YAML + the same heading. Make sure the `> 💡 **Tip**` line is preserved after the language header.
- **Validate:** Run `head -10 commands/rca.md` and confirm frontmatter starts with `---`. Run `head -10 commands/guide.md` and confirm the same.

### Task 11: Update README and archive old plan

- **Action:** modify + move
- **File:** `README.md`, `.agents/plans/system-improvements-from-reviews.md`
- **Pattern:** N/A
- **Details:**
  1. **README.md** — In the "What Gets Installed" commands table (around line 168-184):
     - Remove the rows for `git-commit` and `git-pr` (they are now skills only)
     - Remove the row for `end-to-end` (deprecated)
     - In the skills table (around line 188-203), update the `git` skill description to clarify it handles both commits and PRs:
       `| \`git\` | "commit this", "create a PR", "push changes", "save to git" |`

  2. **README.md** — In "Recommended Workflow > Feature development" (around line 244-257):
     - Remove `/git-commit` and `/git-pr` lines
     - Replace with: `"commit this"          → git skill handles commits and PRs`
     - Remove the `/end-to-end` section entirely (around line 259-262)
     - Remove `> **Or do it all in one command:** ...` line (around line 329)

  3. **README.md** — In "Command Chaining" (around line 282-291):
     - Remove the `/end-to-end` row from the arguments table

  4. **README.md** — In "Full PIV loop example" (around line 294-327):
     - Replace steps 8-9 (`/git-commit` and `/git-pr`) with:
       ```
       # 8. Commit and PR (auto-triggered — just say "commit this" then "create a PR")
       ```

  5. **Delete old plan:** Remove the obsolete plan file (its 17 tasks were already implemented incrementally):
     ```bash
     rm .agents/plans/system-improvements-from-reviews.md
     ```
- **Gotcha:** The README changes are multiple small edits across the file. Make each edit individually using the Edit tool, verifying after each one. Do not attempt a full file rewrite.
- **Validate:** Read README.md and confirm: no mentions of `git-commit` or `git-pr` as commands, no mentions of `end-to-end`, git skill row updated. Confirm `.agents/plans/system-improvements-from-reviews.md` no longer exists.

## Test Tasks

> This project has no automated tests. Validate manually:

### Manual Test 1: Verify CLI installs correctly
- Run `node cli.js --force` and confirm:
  - No `hopla-git-commit`, `hopla-git-pr`, or `hopla-end-to-end` in the output
  - All other commands, skills, and agents install successfully
  - `hopla-git` skill installs with commit.md and pr.md files

### Manual Test 2: Verify git skill is complete
- Check `~/.claude/skills/hopla-git/commit.md` contains the Version Bump step
- Check `~/.claude/skills/hopla-git/pr.md` contains the execution-report/system-review suggestion

### Manual Test 3: Verify planning mode
- Run `node cli.js --force --planning` and confirm:
  - `system-review` and `rca` appear in installed commands
  - `git-commit` and `git-pr` do NOT appear
  - `git` skill is installed

## Validation Checklist

Run in this order — do not proceed if a level fails:

- [ ] **Level 1 — Lint & Format:** N/A (Markdown files, no linter configured)
- [ ] **Level 2 — Type Check:** N/A (no TypeScript in commands/skills). For cli.js: `node --check cli.js`
- [ ] **Level 2.5 — Code Review:** Run `/hopla-code-review` on all changed files
- [ ] **Level 3 — Unit Tests:** N/A (no test framework)
- [ ] **Level 4 — Integration Tests:** `node cli.js --force` — verify install succeeds without errors
- [ ] **Level 5 — Human Review:** Read each modified file end-to-end and verify Markdown structure is valid

## Acceptance Criteria
- [ ] `commands/git-commit.md` does not exist
- [ ] `commands/git-pr.md` does not exist
- [ ] `commands/end-to-end.md` does not exist
- [ ] `skills/git/commit.md` has Version Bump step and PR suggestion
- [ ] `skills/git/pr.md` has execution-report/system-review suggestion and dev/main sync note
- [ ] `commands/plan-feature.md` Phase 2 references execution reports
- [ ] `commands/plan-feature.md` Phase 3 has "Assumption verification" subsection
- [ ] `commands/plan-feature.md` Phase 4 has role access matrix, external integration buffer, UI iteration budget bullets
- [ ] `commands/plan-feature.md` Phase 6 has N+1 query check item
- [ ] `commands/execute.md` Step 1 has concrete verification paragraph
- [ ] `commands/execute.md` Step 4 has Destructive Command Guard before Scope Guard
- [ ] `commands/execute.md` Step 4 commit strategy has early commit guidance
- [ ] `skills/code-review/SKILL.md` has multi-user auth, expanded N+1, and stale dependency arrays
- [ ] `agents/system-reviewer.md` has step 5.5, Recommendation Tracking section, and Next Step
- [ ] `skills/execution-report/SKILL.md` has "Ready-to-paste CLAUDE.md entry" field
- [ ] `skills/verify/SKILL.md` has "Plan Execution Check" section
- [ ] `skills/debug/SKILL.md` has "Escalation" section with RCA reference
- [ ] `skills/brainstorm/SKILL.md` has "Integration" section with create-prd and debug references
- [ ] `commands/rca.md` has YAML frontmatter and language header
- [ ] `cli.js` PLANNING_COMMANDS includes system-review.md and rca.md, excludes git-commit.md and git-pr.md
- [ ] `cli.js` PLANNING_SKILLS includes "git"
- [ ] `README.md` has no mentions of git-commit/git-pr as commands or end-to-end
- [ ] `README.md` git skill row reflects commit + PR capability
- [ ] `.agents/plans/system-improvements-from-reviews.md` no longer exists (deleted)
- [ ] `node cli.js --force` runs without errors

## Confidence Score: 9/10

- **Strengths:** All files are Markdown or simple JS (easy to edit). All changes are additive except 3 file deletions and 1 field replacement. Every improvement is backed by concrete evidence from 21 real system reviews. The old plan was already mostly implemented, so this builds on proven patterns.
- **Uncertainties:** The git unification removes two commands users may have bookmarked. The skill auto-trigger should cover most cases, but users who explicitly type `/hopla-git-commit` will get "command not found".
- **Mitigations:** The `removeStaleCommands()` function auto-cleans old files. The README update documents the new invocation method. The git skill triggers on the same keywords ("commit", "PR").

## Notes for Executing Agent
- These are Markdown command files and skill files, not code. Edit carefully to preserve existing structure.
- When adding bullets to Phase 4 of plan-feature.md, maintain the same indentation (they're inside a list under "Based on research, define:").
- The 3 file deletions (git-commit.md, git-pr.md, end-to-end.md) are the only destructive operations. Verify the skill versions have the merged content BEFORE deleting the commands.
- The cli.js changes are minimal — only the PLANNING_COMMANDS array and PLANNING_SKILLS constant. Do not modify any other logic.
- Remember: any change to `commands/`, `skills/`, or `agents/` affects every future user install. Review the diff carefully.
- Total files modified: 14. Total files deleted: 3. Total files moved: 1.
