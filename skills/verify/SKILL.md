---
name: verify
description: "Verification gate that ensures all completion claims are backed by fresh evidence. Use when the agent is about to declare work as done, finished, complete, ready, or implemented. Also use when hearing 'listo', 'terminé', 'ya está', 'done', 'finished', 'all tests pass', 'everything works', or any completion claim. Do NOT use for intermediate progress updates or partial task completion."
---

# Verification Before Completion

## Iron Law
**NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.**

Never declare work as done based on memory, assumptions, or previous outputs. Every claim must be backed by a fresh execution right now.

## Gate Process

When about to declare any task as complete:

1. **IDENTIFY** — What verification command(s) confirm this claim?
2. **EXECUTE** — Run the verification fresh (never reuse previous output)
3. **READ** — Read the complete output carefully
4. **VERIFY** — Confirm the output actually proves the claim
5. **ONLY THEN** — Declare the work complete with evidence

## What Requires What Evidence

| Claim | Required Evidence |
|-------|------------------|
| "Tests pass" | Fresh `npm test` / `pytest` / test runner output showing all green |
| "Build succeeds" | Fresh build command output with no errors |
| "Lint is clean" | Fresh linter output showing 0 errors |
| "Types check" | Fresh `tsc --noEmit` / type checker output |
| "Feature works" | Demonstrate the feature running (test or manual verification) |
| "Bug is fixed" | Test that reproduces the bug now passes |
| "No regressions" | Full test suite passes, not just new tests |

## Prohibited Phrases Before Verification

These phrases are RED FLAGS — never use them without fresh evidence:

- "should work" / "debería funcionar"
- "probably passes" / "probablemente pase"
- "seems to be fine" / "parece estar bien"
- "I believe this fixes" / "creo que esto arregla"
- "this should resolve" / "esto debería resolver"
- "looks correct" / "se ve correcto"

Instead, run the verification and report actual results.

## Integration with Validation Pyramid

When completing a feature (not just a single file edit), run the full validation pyramid:

1. **Level 1**: Lint & format
2. **Level 2**: Type check
3. **Level 3**: Unit tests
4. **Level 4**: Integration tests (if applicable)
5. **Level 5**: Human review suggestion

Reference `/hopla-validate` for project-specific validation commands.

## Scope

- **Applies to**: Any declaration of completion, whether mid-conversation or at end of task
- **Does NOT apply to**: Intermediate progress updates ("I've finished editing file X, moving to file Y")
- **Partial completion**: You may say "file X is updated" without full validation, but "the feature is complete" requires the full gate
