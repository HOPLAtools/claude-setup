---
description: Fix issues found in a code review report
argument-hint: "<review-file-or-description> [scope]"
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Fix the issues identified in a code review.

## Inputs

- **$1** — Path to a code review report file OR a natural language description of the issues to fix
- **$2** (optional) — Scope: focus only on a subset of issues (e.g., "security issues only", "critical and high severity only")

## Step 1: Load the Review

If $1 is a file path, read the entire file first to understand all issues before starting any fixes.
If $1 is a description, treat it as the list of issues to fix.

If $2 is provided, filter to only the issues within that scope.

## Pre-Fix Verification

Before fixing each issue:
1. **Verify the issue is real** — Read the actual code. Is this a genuine bug or a false positive?
2. **Push back if needed** — If an issue is not real, document WHY it's a false positive instead of "fixing" it
3. **YAGNI check** — Does the suggested fix add unnecessary complexity? If the fix introduces code that isn't needed for current requirements, skip it and document the reason
4. **Never use performative agreement** — Don't say "You're absolutely right!" before verifying. Check the codebase first, then respond.

## Step 2: Fix Issues One by One

For each issue, in order of severity (critical → high → medium → low):

1. **Explain** what was wrong and why it's a problem
2. **Implement** the fix
3. **Verify** — create and run a relevant test or check to confirm the fix works

Do not move to the next issue until the current one is verified.

## Step 3: Run Full Validation

After all fixes are complete, run the project's validation suite.

If a `/validate` command exists in `.claude/commands/validate.md`, run it.
Otherwise, run the standard checks for the project stack:
- Linting
- Type checking
- Test suite

## Step 4: Summary Report

Provide a summary of:
- Issues fixed (with file and line reference)
- Issues skipped and why (if $2 scope was used)
- Validation result ✅/❌
- Any issues that could not be fixed automatically and require human review

## Next Step

After all fixes pass validation, suggest:
> "All review issues fixed and validation passed. Run `/hopla-execution-report` to document the implementation, then `/hopla-git-commit` to commit."
