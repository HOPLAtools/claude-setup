---
description: Execute a structured plan from start to finish with validation
argument-hint: "<plan-file-path>"
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Execute the implementation plan provided. You are the executing agent — you have not seen the planning conversation. The plan is your only source of truth.

## Step 1: Load Context

Read in this order:
1. **$1** — The plan file (read it entirely before writing a single line of code)
2. `CLAUDE.md` or `AGENTS.md` at project root — rules and patterns to follow
3. All files listed in the plan's **Context References** section
4. Any `.agents/guides/` files referenced in the plan or relevant to the tasks (e.g. `@.agents/guides/api-guide.md`)

Do not start implementing until you have read everything above.

### Verification Checkpoints (before writing code)

Verify that the plan's documented assumptions still hold. **You are not re-auditing from scratch** — the planner already did the full audit and documented findings in Context References and Gotchas. Your job is to confirm each finding is still accurate:

- **Data models:** Read the referenced API route or schema. Confirm the field variants the planner documented (null cases, alternative representations, resolution chain) still match the actual code.
- **Value semantics:** If the plan documents a formula, confirm the sign/unit convention still matches the actual display/formatter code.
- **Reference patterns:** Read each Pattern file completely. Confirm the specific API calls, types, and data flow still match what the plan describes.

See `.agents/guides/data-audit.md` for detailed criteria on what to check.

If a discrepancy is found, stop immediately and file a Blocker Report below. You may continue with tasks that are not blocked by the discrepancy.

#### Blocker Report

Use when a plan assumption does not match reality:

```
## Blocker Report

- **Blocked task:** [Task number and name]
- **Failed assumption:** [What the plan said]
- **Actual state:** [What you found — include a code snippet or data example]
- **Recommendation:** [Replan X | Fix Y | Proceed with caution because Z]
```

## Step 2: Verify Git State

```bash
git branch --show-current
git status
```

### Clean working tree check

If there are uncommitted changes, **stop and warn the user**:
> "There are uncommitted changes in the working tree. These will be mixed into the implementation and make it harder to review and revert. Please commit or stash them before continuing."

Do not proceed until the working tree is clean.

### Branch check

Check that the current branch follows Git Flow:
- **Never execute on `main` or `master`** — stop and warn the user
- **If on `develop`/`dev`** — ask: "You're on `develop`. Should I create a feature branch first? (recommended: `feature/[plan-name]`)"
- **If on a `feature/`, `fix/`, or `hotfix/` branch** — proceed

If a new branch is needed, propose the name and wait for confirmation before creating it:
```bash
git checkout -b feature/[kebab-case-plan-name]
```

## Step 3: Confirm Understanding

Before executing, summarize:
- What you are about to build
- The branch where changes will be made
- How many tasks are in the plan
- Any constraints or gotchas flagged in the plan
- Anything unclear that needs clarification before proceeding

If anything in the plan is ambiguous or contradictory, **stop and ask** before writing code.

## Step 4: Execute Tasks in Order

Work through each task in the plan sequentially. For each task:

1. **Announce** the task you are starting (e.g., "Starting Task 2: Create the filter component")
2. **Follow the pattern** referenced in the plan — do not invent new patterns
3. **Implement** only what the task specifies — nothing more
4. **Validate** the task using the method specified in the plan's validate field
5. **Report completion** with a brief status: what was done, what was skipped, any decision made
6. **Do not proceed** to the next task if the current one fails validation

**Git strategy:** Do not commit after individual tasks. Keep all changes staged but uncommitted until the full plan passes validation (Step 5). This allows a clean revert if later tasks fail.

**Pause and report if, during implementation:**
- A task is ambiguous or has multiple valid implementations
- Something unexpected is discovered that could affect subsequent tasks
- The plan's structure or ordering doesn't match conventions used elsewhere in the project

Do not improvise silently. When in doubt, stop and ask.

## Step 5: Run Full Validation Pyramid

After all tasks are complete, run the full validation sequence in order.
**Do not skip levels. Do not proceed if a level fails.**

Use the exact commands from the plan's **Validation Checklist**. If not specified, read `CLAUDE.md` section "Development Commands" to find the correct commands.

### Level 1 — Lint & Format
Run the project's lint and format check (e.g. `npm run lint`, `uv run ruff check .`).
Fix any issues before continuing.

### Level 2 — Type Check
Run the project's type checker (e.g. `npm run type-check`, `uv run mypy .`).
Fix all type errors before continuing.

### Level 3 — Unit Tests
Run the project's unit test suite (e.g. `npm run test`, `uv run pytest`).
If tests fail:
- Investigate the root cause
- Fix the code (not the tests)
- Re-run until all pass

### Level 4 — Integration Tests
Run integration tests or manual verification as specified in the plan (e.g. `npm run test:e2e`, manual curl).
Verify the feature works end-to-end.

### Level 5 — Code Review
Run a code review on all changed files following the `/hopla-code-review` process. This catches bugs that linting, types, and tests miss (security issues, logic errors, pattern violations).

If the review finds critical or high severity issues, **fix them before proceeding**.

### Level 6 — File Drift Check
Compare the files actually changed against the plan's task list:

```bash
git diff --name-only
git ls-files --others --exclude-standard
```

Flag any files that were changed but are **not listed in any task**. These are potential scope leaks — unplanned additions that didn't get the same scrutiny as planned tasks. Report them in the completion summary so the user can review.

### Level 7 — Human Review (flag for user)
List what the user should manually verify:
- Specific behaviors to test in the browser or CLI
- Edge cases to check
- Any decisions made during implementation that the user should review

## Step 6: Completion Report

Provide a summary of what was done:

```
## Execution Summary

**Plan:** [path to plan file]
**Status:** ✅ Complete | ⚠️ Partial | ❌ Blocked

### Tasks Completed
- [x] Task 1: [description]
- [x] Task 2: [description]
- [ ] Task 3: [description — if skipped, explain why]

### Validation Results
- Level 1 Lint:        ✅ / ❌
- Level 2 Type Check:  ✅ / ❌
- Level 3 Unit Tests:  ✅ [X passed] / ❌ [X failed]
- Level 4 Integration: ✅ / ❌
- Level 5 Code Review: ✅ [X issues found, all fixed] / ❌
- Level 6 File Drift:  ✅ [all files in plan] / ⚠️ [X unplanned files]
- Level 7 Human:       🔍 See items below

### For Human Review
- [specific thing to verify manually]

### Deviations from Plan
- [anything that differed from the plan and why]
```

## Step 7: Suggest Next Steps

After the summary, suggest:
1. Run `/hopla-execution-report` to document this implementation for system review
2. Run `/hopla-git-commit` once everything is approved
