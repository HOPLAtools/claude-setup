---
description: Investigate a bug or issue and produce a structured RCA document
argument-hint: "<issue-description-or-github-url>"
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

# Root Cause Analysis

> 💡 **Tip**: Use Extended Thinking mode for complex bugs with multiple possible causes.

## Input
- `$ARGUMENTS`: Issue description, error message, or GitHub issue ID/URL

## Process

### Step 1: Gather Information
- If a GitHub issue: read the full issue, comments, and any linked PRs
- If an error: read the full error message and stack trace
- Run `git log --oneline -20` to check recent changes
- Run `git diff` to see current uncommitted changes

### Step 2: Investigate
- Search the codebase for the affected code: `grep`, `glob`, `read`
- Identify the function/component where the error originates
- Check git blame for recent changes to that area
- Look for related tests — do they pass? Are they missing?

### Step 3: Root Cause Analysis
Apply the hopla-debug methodology:
1. **Reproduce**: Can you trigger the issue?
2. **Narrow**: Which exact file and line?
3. **Hypothesize**: What's the most likely cause based on evidence?
4. **Verify**: Can you confirm the hypothesis?

### Step 4: Generate RCA Document
Save to `.agents/rca/[issue-name].md`:

```
# RCA: [Issue Title]

## Symptoms
What the user sees / what the error is

## Root Cause
What's actually wrong and why

## Evidence
- [file:line] — what you found
- [git commit] — what changed

## Proposed Fix
What needs to change to resolve this

## Tests Needed
- Test to reproduce the bug
- Test to verify the fix

## Prevention
How to prevent similar issues in the future

## Next Steps
- [ ] Implement fix (run `/hopla:execute` with a plan, or fix directly if simple)
- [ ] Add regression test
- [ ] Validate with `/hopla:validate`
```

## Output
The RCA document in `.agents/rca/`, ready for review or execution.
