---
name: hopla-tdd
description: "Test-driven development workflow using the RED-GREEN-REFACTOR cycle. Use when implementing features that require tests, when the plan specifies test tasks, when the user mentions 'TDD', 'test first', 'write tests', or when working on bug fixes that should have regression tests. Do NOT use for documentation, configuration, or tasks where tests don't apply."
---

# Test-Driven Development (TDD)

## Principle
**Write the test first, then the code to make it pass.** This ensures every piece of code has a clear purpose and verifiable behavior.

## The RED-GREEN-REFACTOR Cycle

### 🔴 RED: Write a Failing Test
1. Write a test that describes the expected behavior
2. Run the test — it MUST fail
3. Verify it fails for the **right reason** (not a typo or import error)
4. If it passes immediately, the test isn't testing anything new

### 🟢 GREEN: Make It Pass
1. Write the **minimum code** to make the test pass
2. Don't add extra features, optimizations, or edge cases yet
3. Run the test — it MUST pass now
4. Run ALL existing tests — they must STILL pass (no regressions)

### 🔵 REFACTOR: Clean Up
1. Improve the code without changing behavior
2. Remove duplication, improve naming, simplify logic
3. Run ALL tests again — everything must still be green
4. Only refactor when tests are green

## When to Apply TDD

**Strongly recommended for:**
- New functions, methods, or components
- Bug fixes (write the reproduction test first)
- API endpoints and their handlers
- Data transformations and business logic
- Utility functions

**Optional for:**
- Configuration files
- Simple UI layout changes
- Documentation
- Boilerplate with no logic
- Legacy code without existing test infrastructure

## Integration with /hopla-execute

When executing a plan with TDD:
1. For each implementation task that has associated tests:
   - Write the test FIRST (RED)
   - Then implement the code (GREEN)
   - Then clean up (REFACTOR)
2. Validate after each cycle: run the test suite
3. Don't skip the RED step — it catches specification errors early

## Common Rationalizations (and why they're wrong)

| Rationalization | Why It's Wrong |
|----------------|---------------|
| "I'll write tests after" | You'll write tests that match the code, not the spec |
| "This is too simple to test" | Simple code grows complex. The test documents intent |
| "It'll be faster without TDD" | Debugging later costs more than testing now |
| "The test framework isn't set up" | Set it up. It's a one-time cost |
| "I know this works" | Then the test will pass quickly. Write it anyway |

## Test Quality Guidelines

- **One assertion per test** (when practical)
- **Clear test names**: `test_user_login_with_invalid_password_returns_401`
- **Test behavior, not implementation**: Don't test private methods directly
- **Use real objects** when possible; mock only external dependencies
- **Tests should be independent**: No shared state between tests
