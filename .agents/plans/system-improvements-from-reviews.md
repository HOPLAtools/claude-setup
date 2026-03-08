# Plan: System Improvements from Real-World Reviews

## Overview
Apply process improvements derived from analyzing 7 complete PIV cycles (plan→execute→review) on the SheetCompare project. The improvements target `hopla-plan-feature.md` and `hopla-execute.md` to prevent recurring issues, plus fix workflow chaining across all commands so each one correctly suggests the next step in the PIV loop.

## Requirements Summary
- Add "Interaction States & Edge Cases" section to plan template for features with interactive UI
- Make API validation requirements more prominent (already exists but ignored in 4/7 cycles)
- Reinforce test task requirement (already exists but ignored in 4/7 cycles)
- Strengthen MEMORY.md consultation with an explicit checklist in Phase 4
- Add "Base Branch" field to plan template + validate in execute
- Add "Time-box Warning" field for risky tasks
- Add automatic "Regression Check" task when plan touches existing functionality
- Add scope guard to execute command (out-of-scope → commit + new branch)
- Fix workflow chaining: each command must suggest the correct next step per the PIV loop
- Correct the recommended workflow order in README.md

## Out of Scope
- Changes to `cli.js` (no new commands, no renames)
- Changes to `files/CLAUDE.md` (global template)
- Project-specific AG Grid guides (those belong in the SheetCompare project, not the system)

## Context References
Key files the executing agent must read before starting:
- `files/commands/hopla-plan-feature.md` — the main file to modify (196 lines, the planning command)
- `files/commands/hopla-execute.md` — the second file to modify (185 lines, the execution command)
- `files/commands/hopla-code-review.md` — add next step suggestion
- `files/commands/hopla-code-review-fix.md` — add next step suggestion
- `files/commands/hopla-execution-report.md` — add next step suggestion
- `files/commands/hopla-git-commit.md` — fix next step suggestion
- `files/commands/hopla-git-pr.md` — add next step suggestion
- `README.md` — fix recommended workflow order
- `.agents/guides/add-command.md` — rules for modifying command files
- `CLAUDE.md` — project rules (changes to `files/` affect every user install)

## Implementation Tasks

> All fields are required. Use `N/A` if a field does not apply — never leave a field blank.

### Task 1: Add "Interaction States & Edge Cases" section to Phase 4

- **Action:** modify
- **File:** `files/commands/hopla-plan-feature.md`
- **Pattern:** The existing "Derived/computed values" bullet in Phase 4 (line 66) — follow the same level of specificity
- **Details:**
  Add a new bullet point at the end of Phase 4 ("Design the Approach"), after the "Derived/computed values" bullet:

  ```markdown
  - **Interaction states & edge cases:** For features involving interactive UI (forms, grids, keyboard navigation, wizards, CLI interactions), define a matrix of user interactions and their expected behavior. Cover: all keyboard shortcuts (both directions — e.g., Tab AND Shift+Tab), state transitions (empty → editing → saved → error), and boundary conditions (first item, last item, empty list, maximum items). This prevents iterative fix rounds that consumed up to 40% of session time in past implementations.
  ```

- **Gotcha:** Keep this as a single bullet point, not a separate phase. It's a design consideration, not a process step.
- **Validate:** Read the file and confirm the bullet appears in Phase 4, after "Derived/computed values"

### Task 2: Add "Interaction Matrix" section to plan template

- **Action:** modify
- **File:** `files/commands/hopla-plan-feature.md`
- **Pattern:** The existing `## Test Tasks` section in the template — same level heading
- **Details:**
  Add a new section in the plan template (Phase 5), between `## Implementation Tasks` (after the last task example) and `## Test Tasks`:

  ```markdown
  ## Interaction Matrix (if applicable)

  > Include this section when the feature involves interactive UI (grids, forms, keyboard navigation, drag-and-drop, wizards). Skip for pure backend/API features.

  | Action | Context | Expected Behavior |
  |--------|---------|-------------------|
  | [e.g., Tab] | [e.g., Last editable cell in row] | [e.g., Move to first cell of next row] |
  | [e.g., Escape] | [e.g., While editing a cell] | [e.g., Cancel edit, restore previous value] |

  Include: keyboard shortcuts (forward AND reverse), mouse interactions, state transitions, boundary conditions (first/last item, empty state, maximum items).
  ```

- **Gotcha:** This must go BEFORE `## Test Tasks` so the executing agent sees it before writing tests (tests should cover these interactions).
- **Validate:** Read the file and confirm "Interaction Matrix" appears between the last implementation task example and "Test Tasks"

### Task 3: Make API validation more prominent in Phase 4

- **Action:** modify
- **File:** `files/commands/hopla-plan-feature.md`
- **Pattern:** N/A
- **Details:**
  Add a new bullet point in Phase 4 ("Design the Approach"), after the new "Interaction states" bullet:

  ```markdown
  - **API input validation:** For every API endpoint being created or modified, specify: required fields, field format constraints (e.g., "IMEI must be exactly 15 digits"), payload size limits, and what the user sees on validation failure. This was the #2 most common gap in past plans — validation was only added after code review in 4 of 7 implementations.
  ```

- **Gotcha:** The API validation fields already exist in the task template (lines 105-108). This bullet in Phase 4 is a reminder to *think about it during design*, not just fill in fields during task writing.
- **Validate:** Read Phase 4 and confirm both the design reminder and the task template fields exist

### Task 4: Strengthen MEMORY.md consultation in Phase 4

- **Action:** modify
- **File:** `files/commands/hopla-plan-feature.md`
- **Pattern:** N/A
- **Details:**
  Phase 2 step 5 already mentions reading MEMORY.md. Add a concrete checklist to Phase 4 to ensure findings are actually applied. Add after the "API input validation" bullet:

  ```markdown
  - **User preferences check:** Before specifying UI architecture (modal vs. inline, page vs. panel, dialog vs. drawer), verify against MEMORY.md and conversation history for established preferences. In past implementations, plans that specified modals were rejected because the user preferred inline panels — this caused rework. When no preference exists, note it as a decision point for the user to confirm.
  ```

- **Gotcha:** N/A
- **Validate:** Read Phase 4 and confirm the bullet exists

### Task 5: Add "Base Branch" and "Time-box Warnings" to plan template

- **Action:** modify
- **File:** `files/commands/hopla-plan-feature.md`
- **Pattern:** N/A
- **Details:**
  1. In the plan template (Phase 5), add a `## Git Strategy` section right after `## Out of Scope`:

     ```markdown
     ## Git Strategy
     - **Base branch:** `[develop | dev | main — specify which branch to create the feature branch from]`
     - **Feature branch:** `feature/[kebab-case-name]`
     ```

  2. Add a `- **Time-box:**` optional field to the task template, after `**Validate:**`:

     ```markdown
     - **Time-box:** [Optional — for tasks with known technical risk, specify a maximum time and fallback. E.g., "30 min max. If auto-sizing doesn't work, fall back to fixed widths." Omit for straightforward tasks.]
     ```

- **Gotcha:** The base branch field is critical — one PR was merged to `main` instead of `dev` because the plan didn't specify it. The time-box is optional per task (most tasks don't need it).
- **Validate:** Read the template and confirm both `## Git Strategy` and the `Time-box` field exist

### Task 6: Add automatic "Regression Check" task guidance

- **Action:** modify
- **File:** `files/commands/hopla-plan-feature.md`
- **Pattern:** N/A
- **Details:**
  Add a note at the end of `## Test Tasks` in the plan template:

  ```markdown
  > **Regression check:** If this feature modifies existing interactive functionality (editing flows, keyboard navigation, API endpoints with existing consumers), include a task to smoke-test the existing behavior AFTER implementation. In past implementations, changes to shared utilities broke existing interactions that weren't covered by the plan's task list.
  ```

- **Gotcha:** This is guidance for the planner, not a mandatory task. The planner decides if it applies.
- **Validate:** Read `## Test Tasks` and confirm the regression note exists

### Task 7: Add verification checklist items for new requirements

- **Action:** modify
- **File:** `files/commands/hopla-plan-feature.md`
- **Pattern:** Existing verification items in Phase 6 (lines 156-166)
- **Details:**
  Add three new checklist items to Phase 6 ("Verify the Plan"), after the existing items:

  ```markdown
  - [ ] **Git strategy specified:** Base branch and feature branch are defined in `## Git Strategy`
  - [ ] **Interaction matrix included:** If the feature involves interactive UI, the `## Interaction Matrix` section is filled out — or explicitly marked as N/A with justification
  - [ ] **Time-box on risky tasks:** Any task involving unfamiliar libraries, heuristic parsing, or known-complex behavior (auto-sizing, animation, real-time sync) has a Time-box with a fallback strategy
  ```

- **Gotcha:** Keep the existing checklist items intact — only append new ones.
- **Validate:** Read Phase 6 and confirm the 3 new items appear after the existing ones

### Task 8: Add scope guard to execute command

- **Action:** modify
- **File:** `files/commands/hopla-execute.md`
- **Pattern:** N/A
- **Details:**
  Add a new subsection at the end of Step 4 ("Execute Tasks in Order"), after the "Do not improvise silently" line:

  ```markdown
  ### Scope Guard

  If the user requests changes that are NOT in the plan during execution:

  1. **Acknowledge** the request
  2. **Assess** whether it's a small adjustment (< 5 minutes, same files) or a new feature
  3. **If small adjustment:** implement it and flag it as a deviation in the completion report
  4. **If new feature or significant addition:**
     - Suggest committing the current planned work first
     - Then create a new branch or add it to the backlog
     - Say: "This looks like a separate feature. I recommend we commit the current work first, then handle this in a new branch. Should I add it to `.agents/plans/backlog/` instead?"
  5. **Never** silently add significant unplanned work — scope creep caused the lowest alignment score (6/10) in past implementations
  ```

- **Gotcha:** The threshold between "small adjustment" and "new feature" is subjective. The guidance "< 5 minutes, same files" gives a concrete heuristic.
- **Validate:** Read Step 4 and confirm the Scope Guard subsection exists

### Task 9: Add base branch validation to execute command

- **Action:** modify
- **File:** `files/commands/hopla-execute.md`
- **Pattern:** The existing "Branch check" in Step 2 (lines 59-69)
- **Details:**
  Modify the "Branch check" subsection in Step 2. After the existing bullet points, add:

  ```markdown
  - **If the plan specifies a base branch** (in `## Git Strategy`) — verify the current branch was created from that base. If not, warn the user:
    > "The plan specifies base branch `[X]` but the current branch was created from `[Y]`. This may cause the PR to target the wrong branch. Continue anyway?"
  ```

- **Gotcha:** Not all plans will have `## Git Strategy` (older plans or plans for projects that don't use Git Flow). Only check if the section exists.
- **Validate:** Read Step 2 and confirm the base branch validation exists

### Task 10: Fix next step in `hopla-plan-feature`

- **Action:** modify
- **File:** `files/commands/hopla-plan-feature.md`
- **Pattern:** N/A
- **Details:**
  In Phase 7 ("Save Draft and Enter Review Loop"), under **Finalize**, change the current step 2 text from:

  > "Plan saved to `.agents/plans/[feature-name].md`. Run `/hopla-git-commit` to commit it, then share with the team to execute with `/hopla-execute .agents/plans/[feature-name].md`."

  To:

  > "Plan saved to `.agents/plans/[feature-name].md`. Run `/hopla-review-plan .agents/plans/[feature-name].md` to review it, then `/hopla-execute .agents/plans/[feature-name].md` to implement it."

- **Gotcha:** The old text skipped `/hopla-review-plan` entirely. The commit step is not necessary right after planning — it's optional.
- **Validate:** Read Phase 7 Finalize and confirm it mentions `review-plan` as the next step

### Task 11: Fix next step in `hopla-execute`

- **Action:** modify
- **File:** `files/commands/hopla-execute.md`
- **Pattern:** N/A
- **Details:**
  In Step 7 ("Suggest Next Steps"), replace the current content:

  ```
  1. Run `/hopla-execution-report` to document this implementation for system review
  2. Run `/hopla-git-commit` once everything is approved
  ```

  With:

  ```
  1. Run `/hopla-code-review` for a standalone review of the changes (recommended — a fresh review catches issues the executing agent may have missed)
  2. If issues are found, run `/hopla-code-review-fix` to fix them
  3. Run `/hopla-execution-report` to document the implementation
  4. Run `/hopla-git-commit` to commit the changes
  ```

- **Gotcha:** The old text skipped `code-review`, `code-review-fix`, and `git-pr`. The `git-pr` step is suggested by `git-commit`, so it doesn't need to be here.
- **Validate:** Read Step 7 and confirm it lists code-review → code-review-fix → execution-report → git-commit in order

### Task 12: Add next step to `hopla-code-review`

- **Action:** modify
- **File:** `files/commands/hopla-code-review.md`
- **Pattern:** N/A
- **Details:**
  Add a new section at the end of the file (after the "Rules" list):

  ```markdown

  ## Next Step

  After the review, suggest:
  > "Code review saved to `.agents/code-reviews/[name].md`. If issues were found, run `/hopla-code-review-fix .agents/code-reviews/[name].md` to fix them. If the review passed clean, proceed to `/hopla-execution-report`."
  ```

- **Gotcha:** N/A
- **Validate:** Read the end of the file and confirm the "Next Step" section exists

### Task 13: Add next step to `hopla-code-review-fix`

- **Action:** modify
- **File:** `files/commands/hopla-code-review-fix.md`
- **Pattern:** The "Next Step" section added to `hopla-code-review.md` in Task 12
- **Details:**
  Add a new section at the end of the file (after Step 4 "Summary Report"):

  ```markdown

  ## Next Step

  After all fixes pass validation, suggest:
  > "All review issues fixed and validation passed. Run `/hopla-execution-report` to document the implementation, then `/hopla-git-commit` to commit."
  ```

- **Gotcha:** N/A
- **Validate:** Read the end of the file and confirm the "Next Step" section exists

### Task 14: Add next step to `hopla-execution-report`

- **Action:** modify
- **File:** `files/commands/hopla-execution-report.md`
- **Pattern:** The "Next Step" section added to previous commands
- **Details:**
  Add a new section at the end of the file (after the report template):

  ```markdown

  ## Next Step

  After the report is saved, suggest:
  > "Execution report saved to `.agents/execution-reports/[name].md`. Run `/hopla-git-commit` to commit your changes."
  ```

- **Gotcha:** N/A
- **Validate:** Read the end of the file and confirm the "Next Step" section exists

### Task 15: Fix next step in `hopla-git-commit`

- **Action:** modify
- **File:** `files/commands/hopla-git-commit.md`
- **Pattern:** N/A
- **Details:**
  Modify Step 6 ("Push Reminder"). After the existing push reminder text, add:

  ```markdown

  If the user confirms the push (or if the branch was already pushed), suggest:
  > "Ready to create a Pull Request? Run `/hopla-git-pr` to create one."
  ```

- **Gotcha:** Don't remove the existing push reminder — just append the PR suggestion after it.
- **Validate:** Read Step 6 and confirm it mentions both push and `/hopla-git-pr`

### Task 16: Add next step to `hopla-git-pr`

- **Action:** modify
- **File:** `files/commands/hopla-git-pr.md`
- **Pattern:** N/A
- **Details:**
  Add a new section at the end of Step 6 (after "Never merge automatically"), before Step 7 ("Post-Merge Cleanup"):

  ```markdown

  After showing the PR URL, suggest:
  > "PR created. To complete the cycle, run `/hopla-execution-report` (if not done yet) and `/hopla-system-review` after the PR is merged."
  ```

- **Gotcha:** Place this BEFORE Step 7 (Post-Merge Cleanup), not after it. Step 7 is a separate flow that happens later when the PR is merged.
- **Validate:** Read Step 6 and confirm the next step suggestion appears before Step 7

### Task 17: Update recommended workflow in README.md

- **Action:** modify
- **File:** `README.md`
- **Pattern:** N/A
- **Details:**
  1. In the "Feature development (PIV loop)" section (lines 164-174), replace the current workflow with:

     ```
     /hopla-prime          → load context at session start
     /hopla-plan-feature   → research codebase and create plan
     /hopla-review-plan    → review plan summary and approve
     /hopla-execute        → implement the plan with validation
     /hopla-code-review    → standalone review of changes
     /hopla-code-review-fix → fix issues found
     /hopla-execution-report → document what was built
     /hopla-git-commit     → save to git
     /hopla-git-pr         → open pull request on GitHub
     ```

  2. In the "After implementation" section (lines 176-180), replace with:

     ```
     /hopla-system-review  → analyze plan vs. actual for process improvements
     ```

  3. In the "Full PIV loop example" section (lines 199-225), update the order to match:

     ```
     # 1. Plan
     /hopla-plan-feature add user authentication
     → saves: .agents/plans/add-user-authentication.md

     # 2. Review plan
     /hopla-review-plan .agents/plans/add-user-authentication.md

     # 3. Execute
     /hopla-execute .agents/plans/add-user-authentication.md
     → implements the plan, runs validation

     # 4. Code review
     /hopla-code-review
     → saves: .agents/code-reviews/add-user-authentication.md

     # 5. Fix issues
     /hopla-code-review-fix .agents/code-reviews/add-user-authentication.md

     # 6. Document
     /hopla-execution-report
     → saves: .agents/execution-reports/add-user-authentication.md

     # 7. Commit
     /hopla-git-commit

     # 8. Pull request
     /hopla-git-pr

     # 9. Process improvement (after PR merge)
     /hopla-system-review .agents/plans/add-user-authentication.md .agents/execution-reports/add-user-authentication.md
     ```

- **Gotcha:** The old example had `execution-report` AFTER `git-commit`. The correct order is before, because `execution-report` reads `git diff HEAD` (uncommitted changes). Also note `system-review` moved to "After implementation" since it runs after the PR is merged.
- **Validate:** Read the README and confirm both the workflow list and the full example match the correct order

## Test Tasks

> This project has no automated tests. Validate manually:

### Manual Test: Verify commands install correctly
- Run `node cli.js --force` and confirm both modified commands appear in the success output
- Verify `~/.claude/commands/hopla-plan-feature.md` contains all new sections
- Verify `~/.claude/commands/hopla-execute.md` contains all new sections

### Manual Test: Verify plan template renders correctly
- Start a new Claude Code session in any project
- Run `/hopla-plan-feature test interaction matrix` (cancel before it finishes)
- Confirm the plan template shown includes: `## Git Strategy`, `## Interaction Matrix`, Time-box field, and the new Phase 4 bullets

## Validation Checklist

Run in this order — do not proceed if a level fails:

- [ ] **Level 1 — Lint & Format:** N/A (Markdown files, no linter configured)
- [ ] **Level 2 — Type Check:** N/A (no TypeScript)
- [ ] **Level 2.5 — Code Review:** Run `/hopla-code-review` on the two changed files
- [ ] **Level 3 — Unit Tests:** N/A (no test framework)
- [ ] **Level 4 — Integration Tests:** `node cli.js --force` — verify install succeeds
- [ ] **Level 5 — Human Review:** Read both files end-to-end and verify coherence

## Acceptance Criteria
- [ ] `hopla-plan-feature.md` Phase 4 has 3 new design bullets: interaction states, API validation reminder, user preferences check
- [ ] Plan template includes `## Git Strategy` with base branch field
- [ ] Plan template includes `## Interaction Matrix (if applicable)` section
- [ ] Task template includes optional `Time-box` field
- [ ] `## Test Tasks` includes regression check guidance
- [ ] Phase 6 verification checklist has 3 new items
- [ ] `hopla-execute.md` Step 4 has a Scope Guard subsection
- [ ] `hopla-execute.md` Step 2 validates base branch against plan
- [ ] `hopla-plan-feature.md` suggests `review-plan` as next step (not `git-commit`)
- [ ] `hopla-execute.md` suggests code-review → code-review-fix → execution-report → git-commit
- [ ] `hopla-code-review.md` has "Next Step" section suggesting `code-review-fix`
- [ ] `hopla-code-review-fix.md` has "Next Step" section suggesting `execution-report` → `git-commit`
- [ ] `hopla-execution-report.md` has "Next Step" section suggesting `git-commit`
- [ ] `hopla-git-commit.md` suggests `git-pr` after push
- [ ] `hopla-git-pr.md` suggests `execution-report` / `system-review` after PR creation
- [ ] `README.md` workflow order matches: plan → review-plan → execute → code-review → code-review-fix → execution-report → git-commit → git-pr → system-review
- [ ] `node cli.js --force` installs all modified files successfully

## Confidence Score: 9/10

- **Strengths:** Both files are Markdown (easy to edit), all changes are additive (no deletions), patterns are clear from the existing structure, and every improvement is backed by concrete evidence from 7 real reviews
- **Uncertainties:** The exact wording may need iteration after real-world use — these improvements are based on one project's experience
- **Mitigations:** All changes are additive and backward-compatible. If any guidance proves too prescriptive, it can be softened in a future iteration without breaking existing plans

## Notes for Executing Agent
- These are Markdown command files, not code. Edit carefully to preserve the existing structure.
- The plan template in `hopla-plan-feature.md` is inside a fenced code block (```markdown ... ```). New sections must go INSIDE this code block at the correct position.
- Do NOT modify any existing content unless explicitly stated — all changes are additive (Tasks 1-9) or targeted replacements (Tasks 10-17).
- After editing, read the full file to verify the Markdown structure is valid (no broken fences, no orphaned headings).
- Remember: any change to `files/` affects every future user install. Review the diff carefully.
- The correct workflow order is: `prime → plan-feature → review-plan → execute → code-review → code-review-fix → execution-report → git-commit → git-pr → system-review`. Every "Next Step" must chain to the correct next command in this sequence.
- Total files modified: `hopla-plan-feature.md`, `hopla-execute.md`, `hopla-code-review.md`, `hopla-code-review-fix.md`, `hopla-execution-report.md`, `hopla-git-commit.md`, `hopla-git-pr.md`, `README.md` (8 files).
