---
description: Execute a structured plan from start to finish with validation
argument-hint: "<plan-file-path>"
---

Execute the implementation plan provided. You are the executing agent — you have not seen the planning conversation. The plan is your only source of truth.

## Step 1: Load Context

Read in this order:
1. **$1** — The plan file (read it entirely before writing a single line of code)
2. `CLAUDE.md` or `AGENTS.md` at project root — rules and patterns to follow
3. All files listed in the plan's **Context References** section
4. Any `.agents/guides/` files referenced in the plan or relevant to the tasks (e.g. `@.agents/guides/api-guide.md`)

Do not start implementing until you have read everything above.

## Step 2: Confirm Understanding

Before executing, summarize:
- What you are about to build
- How many tasks are in the plan
- Any constraints or gotchas flagged in the plan
- Anything unclear that needs clarification before proceeding

If anything in the plan is ambiguous or contradictory, **stop and ask** before writing code.

## Step 3: Execute Tasks in Order

Work through each task in the plan sequentially. For each task:

1. **Announce** the task you are starting (e.g., "Starting Task 2: Create the filter component")
2. **Follow the pattern** referenced in the plan — do not invent new patterns
3. **Implement** only what the task specifies — nothing more
4. **Validate** the task using the method specified in the plan's validate field
5. **Do not proceed** to the next task if the current one fails validation

If you encounter something unexpected (a file doesn't exist, a pattern is different than the plan assumed), **stop and report** before continuing — do not improvise silently.

## Step 4: Run Full Validation Pyramid

After all tasks are complete, run the full validation sequence in order.
**Do not skip levels. Do not proceed if a level fails.**

### Level 1 — Lint & Format
Run the project's lint and format check.
Fix any issues before continuing.

### Level 2 — Type Check
Run the project's type checker.
Fix all type errors before continuing.

### Level 3 — Unit Tests
Run the project's unit test suite.
If tests fail:
- Investigate the root cause
- Fix the code (not the tests)
- Re-run until all pass

### Level 4 — Integration Tests
Run integration tests or manual verification as specified in the plan.
Verify the feature works end-to-end.

### Level 5 — Human Review (flag for user)
List what the user should manually verify:
- Specific behaviors to test in the browser or CLI
- Edge cases to check
- Any decisions made during implementation that the user should review

## Step 5: Completion Report

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
- Level 1 Lint:       ✅ / ❌
- Level 2 Type Check: ✅ / ❌
- Level 3 Unit Tests: ✅ [X passed] / ❌ [X failed]
- Level 4 Integration:✅ / ❌
- Level 5 Human:      🔍 See items below

### For Human Review
- [specific thing to verify manually]

### Deviations from Plan
- [anything that differed from the plan and why]
```

## Step 6: Suggest Next Steps

After the summary, suggest:
1. Run `/hopla-execution-report` to document this implementation for system review
2. Run `/hopla-code-review` for a technical quality check
3. Run `/hopla-commit` once everything is approved
