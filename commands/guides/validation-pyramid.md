---
description: Shared reference for the full validation sequence (lint, types, tests, code review, manual smoke). Used by execute, validate, and verify.
---

# Validation Pyramid

Shared reference for the full validation sequence. Callers (`commands/execute.md`, `commands/validate.md`, `skills/verify/SKILL.md`, plus plans' `Validation Checklist`) pick the levels that apply to their scope.

Run levels **in order**. Do not skip a level. Do not proceed if a level fails — fix it first.

Commands below are generic examples; use the exact commands from the project's `AGENTS.md` (or `CLAUDE.md` as fallback) "Development Commands" section or the plan's checklist.

## Level 1 — Lint & Format

Run the project's lint and format commands (e.g. `npm run lint`, `uv run ruff check .`).

If issues are found:

- Fix them automatically where the tool supports it (e.g. `--fix`)
- Re-run to confirm clean

## Level 1.5 — Hook structural audit (React projects only)

**Skip this level entirely if the project does not use React** or if no `src/hooks/use*.ts` files were touched. For non-React stacks (Vue, Svelte, Angular, plain backend, etc.) move directly to Level 2.

For every new or modified file matching `src/hooks/use*.ts` in this branch, invoke the `hopla:hook-audit` skill:

- **Single-file mode:** `/hopla:hook-audit src/hooks/<file>.ts`
- **Auto-detect mode:** `/hopla:hook-audit` (the skill runs `git diff --name-only HEAD` internally)

Block on any HIGH-severity finding (missing `useMemo` on hook return, `setLoading(false)` inside stale-id guard, anchored-vs-substring error matcher, missing inFlight map next to module-level cache). Medium/low findings surface as warnings — fix before the PR but they do not block.

The skill ships with `@hopla/claude-setup` from release 1.19.0 onward. If it is not available (consumer project on an older plugin release, or marketplace not synced), warn and continue — see `commands/execute.md` Step 4.5 for the full gate description and the fallback policy.

## Level 2 — Type Check

Run the project's type checker (e.g. `npm run typecheck`, `tsc --noEmit`, `uv run mypy .`).

Fix all type errors before continuing.

## Level 3 — Unit Tests

Run the project's unit test suite (e.g. `npm run test`, `uv run pytest`).

If tests fail:

- Investigate the root cause
- Fix the code (not the tests, unless the test is wrong)
- Re-run until all pass

## Level 4 — Integration Tests

Run integration tests if the project has them (e.g. `npm run test:e2e`, manual curl).

If not available, skip and note it in the report.

## Level 5 — Code Review

Trigger the `code-review` skill on the changed files. This catches bugs that lint, types, and tests miss (security issues, logic errors, pattern violations).

If the review finds `critical` or `high` severity issues, **fix them before proceeding**.

## Level 6 — File Drift Check (post-execution only)

Compare the files actually changed against the plan's task list:

```bash
git diff --name-only
git ls-files --others --exclude-standard
```

Flag any files that were changed but are **not listed in any task**. These are potential scope leaks — report them in the completion summary so the user can review.

Skip this level when validating outside of a plan (`/hopla:validate` or the `verify` skill without a plan).

## Level 7 — Human Review

Flag for the user what they should verify manually:

- Specific behaviors to test in the browser or CLI
- Edge cases to check
- Any decisions made during implementation that the user should review

## Which levels apply when

| Caller | Levels |
|---|---|
| `/hopla:validate` | 1–4 |
| `verify` skill | 1–4 + 7 |
| `/hopla:execute` | 1–7 |
| Plan's `Validation Checklist` | as specified by the plan, typically 1–5 or 1–7 |
