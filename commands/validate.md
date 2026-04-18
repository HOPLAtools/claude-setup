---
description: Run the full validation pyramid on the current project
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Run the full validation pyramid to verify project health. Use this command when iterating on a small fix, after a refactor, or anytime you need to re-run all validation steps without starting a full PIV loop.

## Step 1: Load Project Context

Read `CLAUDE.md` or `AGENTS.md` to find the project's validation commands (look for a "Development Commands" or "Testing" section).

If a `.claude/commands/validate.md` exists at the project root, use the commands defined there instead.

## Step 2: Run the Validation Pyramid

Execute each level in order. **Do not skip levels. Do not proceed if a level fails — fix it first.**

### Level 1 — Lint & Format

Run the project's lint and format commands (e.g. `npm run lint`, `uv run ruff check .`).

If issues are found:
- Fix them automatically if the tool supports it (e.g. `--fix`)
- Re-run to confirm clean

### Level 2 — Type Check

Run the project's type checker (e.g. `npm run typecheck`, `uv run mypy .`).

Fix all type errors before continuing.

### Level 3 — Unit Tests

Run the project's test suite (e.g. `npm run test`, `uv run pytest`).

If tests fail:
- Investigate the root cause
- Fix the code (not the tests, unless the test is wrong)
- Re-run until all pass

### Level 4 — Integration Tests

Run integration tests if the project has them (e.g. `npm run test:e2e`).

If not available, skip and note it in the report.

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
> "All validation levels passed. Consider running the `code-review` skill for a deeper analysis — code review catches bugs in 79% of implementations that pass automated validation (stale closures, missing input validation, route shadowing, unhandled promise rejections). Run the `code-review` skill to check, or the `git` skill (say "commit") to commit directly."
