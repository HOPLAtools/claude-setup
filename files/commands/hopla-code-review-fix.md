---
description: Fix issues found in a code review report
argument-hint: "<review-file-or-description> [scope]"
---

Fix the issues identified in a code review.

## Inputs

- **$1** — Path to a code review report file OR a natural language description of the issues to fix
- **$2** (optional) — Scope: focus only on a subset of issues (e.g., "security issues only", "critical and high severity only")

## Step 1: Load the Review

If $1 is a file path, read the entire file first to understand all issues before starting any fixes.
If $1 is a description, treat it as the list of issues to fix.

If $2 is provided, filter to only the issues within that scope.

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
