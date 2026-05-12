---
description: Execute a structured plan from start to finish with validation
argument-hint: "<plan-file-path>"
---

> 💡 **Tip**: For complex tasks with intricate logic, consider using Extended Thinking mode for better reasoning quality.

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

**Concrete verification:** For each table or API endpoint mentioned in the plan's tasks, run ONE verification command before writing code. Examples:
- Schema: `grep -n 'CREATE TABLE\|ALTER.*tablename' migrations/*.sql | tail -3`
- API route: Read the route file and confirm the endpoint signature
- Component: Read the component and confirm its props interface

If ANY assumption from the plan doesn't match current code, file a Blocker Report immediately. Do not proceed with tasks that depend on incorrect assumptions.

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

Check the current branch and determine the appropriate action:
- **If on a `feature/`, `fix/`, or `hotfix/` branch** — proceed
- **If on `develop`/`dev`** — ask: "You're on `develop`. Should I create a feature branch first? (recommended: `feature/[plan-name]`)"
- **If on `main` or `master`** — check if `develop`/`dev` exists:
  - If `develop`/`dev` exists: warn "You're on `main` but `develop` exists. Switch to `develop` first, or create a feature branch from `main` if this is a hotfix."
  - If NO `develop`/`dev` exists (GitHub Flow project): ask "You're on `main` (no develop branch detected). Should I create a feature branch? (recommended: `feature/[plan-name]`)"
- **If the plan specifies a base branch** (in `## Git Strategy`) — verify the current branch was created from that base. If not, warn the user:
  > "The plan specifies base branch `[X]` but the current branch was created from `[Y]`. This may cause the PR to target the wrong branch. Continue anyway?"

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
3. **Check for existing implementations** — before creating new functions, constants, or utility modules, search the codebase for existing implementations that serve the same purpose. Reuse or extend rather than duplicate.
4. **Implement** only what the task specifies — nothing more
5. **Validate** the task using the method specified in the plan's validate field
6. **Report completion** with a brief status: what was done, what was skipped, any decision made
7. **Do not proceed** to the next task if the current one fails validation

**Git strategy:**
- **Plans with 1–7 tasks:** Do not commit after individual tasks. Keep all changes staged but uncommitted until the full plan passes validation (Step 5). This allows a clean revert if later tasks fail.
- **Plans with 8+ tasks (or plans with `## Phase Boundaries`):** Commit at each phase boundary defined in the plan. Run Level 1–2 validation (lint + types) before each intermediate commit. Use commit message format: `feat(<scope>): <feature> — phase N of M`. This prevents losing work on large implementations if later phases fail.
     For plans with 8+ tasks, the **first intermediate commit** should happen after the first 3-4 tasks pass validation — do not wait until a full phase boundary if one isn't defined. Losing work on large implementations was a recurring problem when commits were deferred too long.

**Pause and report if, during implementation:**
- A task is ambiguous or has multiple valid implementations
- Something unexpected is discovered that could affect subsequent tasks
- The plan's structure or ordering doesn't match conventions used elsewhere in the project
- A new API route might shadow or be shadowed by an existing parameterized route (check route ordering — e.g., `/users/all` must be defined before `/users/:id`)

Do not improvise silently. When in doubt, stop and ask.

### Destructive Command Guard

**NEVER** run destructive database or state commands during plan execution:
- `db:reset`, `db:push --force`, `DROP TABLE`, `DELETE FROM` without WHERE
- `rm -rf` on data directories
- `git reset --hard`, `git clean -fd`

If a migration fails or data needs to be reset, **stop and report to the user**. The cost of pausing is low; the cost of data loss is catastrophic. This rule exists because a `db:reset` during execution caused complete local data loss in a past implementation.

### Scope Guard

If the user requests changes that are NOT in the plan during execution:

1. **Acknowledge** the request
2. **Assess** whether it's a small adjustment (< 5 minutes, same files) or a new feature
3. **If small adjustment:** implement it and flag it as a deviation in the completion report. Even for small adjustments, validate with the same rigor as planned tasks — check for DRY violations, verify pattern adherence, and run the relevant validation level before moving on.
4. **If new feature or significant addition:**
   - Suggest committing the current planned work first
   - Then create a new branch or add it to the backlog
   - Say: "This looks like a separate feature. I recommend we commit the current work first, then handle this in a new branch. Should I add it to `.agents/plans/backlog/` instead?"
5. **Never** silently add significant unplanned work — it mixes unreviewed changes into an otherwise reviewed plan and breaks the audit trail

## Step 4.5: Hook structural audit (Level 1.5 gate)

> **Applies only to React projects.** This gate audits React custom hooks (`src/hooks/use*.ts`) for known bug classes. Skip this entire step if the project does not use React, or if no task in the plan touches a file matching `src/hooks/use*.ts`. For non-React stacks the gate is a no-op — proceed directly to Step 5.

> **This is a per-task gate, not a sequential phase.** Invoke the skill inside Step 4 whenever a task creates or modifies a `src/hooks/use*.ts` file, *before* the task is marked complete. The `4.5` numbering exists so the gate aligns with `Level 1.5` in the validation pyramid; the actual execution interleaves with Step 4 task-by-task — not after all tasks finish.

For every new or modified file matching `src/hooks/use*.ts` in this branch, invoke the `hopla:hook-audit` skill **before completing the task** that touches the file. The skill supports two invocation modes — pick whichever fits the context:

- **Single-file mode** — pass the file path explicitly:
  ```
  /hopla:hook-audit src/hooks/<file>.ts
  ```
- **Auto-detect mode** — invoke without arguments; the skill runs `git diff --name-only HEAD` internally and audits every matching `src/hooks/use*.ts` it finds:
  ```
  /hopla:hook-audit
  ```

**Block the task** if the audit reports any HIGH-severity finding (missing `useMemo` on the hook's return, `setLoading(false)` inside a stale-id guard, anchored-vs-substring error matchers, missing inFlight map next to a module-level cache, etc.). Fix the finding before continuing.

Medium and low findings surface as warnings — fix them before opening the PR, but they do not block the task.

**Fallback:** if `hopla:hook-audit` is not available (consumer project on a plugin release older than 1.19.0, or marketplace not synced), warn but proceed. The skill ships with `@hopla/claude-setup` from release 1.19.0 onward — a consumer on an older release should run `/plugin marketplace update hopla-marketplace` to pick it up.

**Why:** the same hook bug classes have been fixed multiple times across different consumer projects (stuck spinners from stale-id-guarded `setLoading`, render storms from un-memoised hook returns, error-mis-overshadow from substring matchers, duplicate in-flight requests from missing dedup). The audit is fast (<5s per file) and mechanical. Catching at write-time is cheaper than catching at code-review or production time.

## Step 5: Run Full Validation Pyramid

After all tasks are complete, run **Levels 1–7** from `commands/guides/validation-pyramid.md` (same repo). Do not skip levels. Do not proceed if a level fails.

Use the exact commands from the plan's **Validation Checklist**. If not specified, read `AGENTS.md` (or `CLAUDE.md` as fallback) "Development Commands" to find the correct commands.

Level 5 triggers the `code-review` skill (not a slash command). Level 6 is the file-drift check specific to plan execution. Level 7 surfaces items for human verification.

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
- Level 1.5 Hook audit: ✅ / ❌ / N/A (no `src/hooks/use*.ts` touched)
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
1. Run the `code-review` skill for a standalone review of the changes (recommended — a fresh review catches issues the executing agent may have missed)
2. If issues are found, run `/hopla:code-review-fix` to fix them
3. Run the `execution-report` skill to document the implementation
4. Run the `git` skill (say "commit") to commit the changes
