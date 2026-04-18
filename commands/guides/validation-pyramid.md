# Validation Pyramid

Shared reference for the full validation sequence. Callers (`commands/execute.md`, `commands/validate.md`, `skills/verify/SKILL.md`, plus plans' `Validation Checklist`) pick the levels that apply to their scope.

Run levels **in order**. Do not skip a level. Do not proceed if a level fails — fix it first.

Commands below are generic examples; use the exact commands from the project's `CLAUDE.md` "Development Commands" section or the plan's checklist.

## Level 1 — Lint & Format

Run the project's lint and format commands (e.g. `npm run lint`, `uv run ruff check .`).

If issues are found:

- Fix them automatically where the tool supports it (e.g. `--fix`)
- Re-run to confirm clean

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
