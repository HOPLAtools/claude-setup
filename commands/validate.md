---
description: Run the full validation pyramid on the current project
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Run the full validation pyramid to verify project health. Use this command when iterating on a small fix, after a refactor, or anytime you need to re-run all validation steps without starting a full PIV loop.

## Step 1: Load Project Context

Read `CLAUDE.md` or `AGENTS.md` to find the project's validation commands (look for a "Development Commands" or "Testing" section).

If a `.claude/commands/validate.md` exists at the project root, use the commands defined there instead.

## Step 2: Run the Validation Pyramid

Execute levels **1–4** from `commands/guides/validation-pyramid.md` (same repo). Do not skip levels. Do not proceed if a level fails — fix it first.

Use the exact commands from the project's `CLAUDE.md` "Development Commands" section. If a `.claude/commands/validate.md` exists at the project root, use the commands defined there instead.

## Step 3: Summary Report

Provide a clear summary:

```
## Validation Report

- Level 1 Lint & Format:  ✅ / ❌ [details]
- Level 2 Type Check:     ✅ / ❌ [details]
- Level 3 Unit Tests:     ✅ [X passed] / ❌ [X failed]
- Level 4 Integration:    ✅ / ❌ / ⏭️ skipped

**Overall: ✅ PASS / ❌ FAIL**
```

If everything passes, confirm the project is healthy.

If anything failed and could not be fixed, list the remaining issues and suggest next steps.

## After Validation Passes

- Suggest running the `code-review` skill if not already done
- Remind that completion claims must be backed by this fresh validation evidence (see hopla-verify skill)

## Next Step

After validation passes, suggest:
> "All validation levels passed. Consider triggering the `code-review` skill for a deeper analysis — it catches classes of bugs that lint/types/tests miss (stale closures, missing input validation, route shadowing, unhandled promise rejections). Say 'review the code' to trigger it, or say 'commit' to use the `git` skill directly."
