---
name: refactoring
description: "Safe refactoring workflow with behavior preservation. Use when the user says 'refactor', 'clean up', 'simplify', 'extract', 'restructure', 'deduplicate', 'rename', or when asking to improve code structure without changing behavior. Do NOT use for bug fixes, new features, or performance work — use the debug, plan-feature, or performance skills instead."
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

# Refactoring: Restructure Without Changing Behavior

## Iron Rule

**Behavior must be identical before and after.** If a refactor changes observable behavior — output, side effects, error shape, API surface — it is not a refactor. Stop and reclassify the work as a feature change or a bug fix.

## Step 1: Confirm the Refactor Is Worth Doing

Ask the user (one question at a time):

- What is the current pain? (duplication, unclear naming, deep nesting, coupled modules)
- What is the desired structure? (extract helper, collapse abstraction, rename, move, inline)
- Is there a test suite, and does it cover the code being refactored?

If the answers reveal a missing test covering the target, **write the test first** (pin current behavior), then refactor. Untested refactors are rewrites.

## Step 2: Capture the Baseline

Run the project's validation commands from `CLAUDE.md` (or use `/hopla:validate`). Record:

- Lint / format — current state
- Types — current state
- Unit tests — pass/fail count
- Relevant integration tests — pass/fail

Every level must be green before starting. A refactor on top of red tests cannot prove it preserved behavior.

## Step 3: Apply the Smallest Safe Change

Pick one refactor at a time:

- Extract function / module
- Rename (symbol, file)
- Inline (remove pointless indirection)
- Move (relocate to a better home)
- Deduplicate (merge two near-identical pieces)
- Replace conditional with polymorphism / table lookup
- Flatten / collapse nesting

**Do not** mix refactors. If the change wants to become a redesign, stop and suggest `/hopla:plan-feature`.

## Step 4: Re-run the Baseline

After each refactor, re-run the same validation set from Step 2. Results must match exactly:

- Same lint result (0 new warnings unless whitelisted)
- Same type result
- Same pass/fail count on tests
- Same integration result

If anything diverges, the refactor leaked behavior — revert or fix before continuing.

## Step 5: Commit at a Clean Boundary

When the baseline is restored and the refactor is coherent, suggest a commit via the `git` skill:

> "Refactor complete — behavior preserved. Say 'commit' to save it with a `refactor:` conventional commit."

## Rules

- One refactor per commit — easier to review, easier to revert
- Never combine refactor + feature in the same commit
- Prefer many small refactors over one large one
- If the test suite is missing, add tests FIRST, then refactor (two commits minimum)
- Preserve public API unless the user explicitly approves a breaking change

## Integration

- Pair with the `tdd` skill when adding characterization tests before a refactor
- Use the `code-review` skill after the refactor to confirm no pattern violations were introduced
- If the refactor touches many files, consider the `worktree` skill for isolation

## Next Step

After the refactor passes validation:

> "Refactor complete and validated. Say 'commit' to trigger the `git` skill with a `refactor:` conventional commit."
