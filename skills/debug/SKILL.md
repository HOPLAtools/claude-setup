---
name: debug
description: "Systematic debugging methodology for finding and fixing bugs. Use when encountering errors, bugs, failures, unexpected behavior, or when the user says 'bug', 'error', 'not working', 'failing', 'debug', 'fix', 'broken', 'falla', 'no funciona', 'error'. Do NOT use for planned feature work or refactoring — only for diagnosing and fixing unexpected problems."
---

# Systematic Debugging

## Core Principle
**ALWAYS find the root cause before proposing fixes.** Never guess at solutions.

## Phase 1: Root Cause Investigation

1. **Read the full error** — Don't skim. Read every line of the error message, stack trace, and logs
2. **Reproduce** — Can you trigger the error reliably? What are the exact steps?
3. **Check recent changes** — `git log --oneline -10` and `git diff` — did something change recently?
4. **Gather evidence** — What do logs, test output, and error messages tell you?
5. **Narrow the scope** — Which file, function, or line is the actual source?

## Phase 2: Pattern Analysis

1. **Find working examples** — Does similar code work elsewhere in the codebase?
2. **Compare** — What's different between working and broken code?
3. **Identify the pattern** — Is this a known pattern (race condition, stale closure, off-by-one, null reference)?
4. **Check dependencies** — Are versions correct? APIs changed?

## Phase 3: Hypothesis and Testing

1. **Form ONE hypothesis** — "The bug is caused by X because of evidence Y"
2. **Test minimally** — Make the smallest possible change to validate the hypothesis
3. **Verify** — Did the test confirm or refute the hypothesis?
4. **If refuted** — Go back to Phase 1 with new information, don't try another random fix

## Phase 4: Implementation

1. **Write a failing test** — Create a test that reproduces the bug
2. **Implement the fix** — One fix only. Don't fix other things at the same time
3. **Verify the test passes** — The reproduction test should now be green
4. **Run full test suite** — Ensure no regressions
5. **Document** — Brief comment or commit message explaining the root cause

## The 3-Strike Rule

**If 3 fixes fail, STOP.**

After 3 failed attempts:
- The problem is likely architectural, not a simple bug
- Present findings to the user: "I've tried X, Y, Z. None worked because..."
- Ask: "Should we reconsider the approach, or do you have additional context?"
- Do NOT try a 4th random fix

## Red Flags (You're Doing It Wrong If...)

- You're proposing a fix before reading the full error
- You've tried 3+ things without stopping to reassess
- You're changing code you don't understand
- You're fixing symptoms instead of causes
- You're adding workarounds instead of addressing the root issue
- You say "let me try this" without explaining WHY it should work

## For Multi-Component Systems

When the bug spans multiple components (frontend ↔ backend ↔ database):
1. Add diagnostic logging at each component boundary
2. Trace the data flow: What goes in? What comes out? Where does it break?
3. Isolate: Can you reproduce with just one component?

## Output

When the bug is fixed, briefly report:
- **Root cause**: What was actually wrong
- **Fix**: What was changed and why
- **Test**: What test verifies the fix
- **Prevention**: How to prevent similar bugs (if applicable)
