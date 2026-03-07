---
description: Technical code review on recently changed files
argument-hint: "[optional: branch or commit range, defaults to HEAD]"
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Perform a technical code review focused on finding real bugs and issues.

## Step 1: Load Context

Read `CLAUDE.md` or `AGENTS.md` to understand project standards and patterns.

If `.agents/guides/` exists, read any guides relevant to the files being reviewed (e.g. `@.agents/guides/api-guide.md` when reviewing API changes). These guides define the expected patterns for specific task types.

## Step 2: Identify Changed Files

```bash
git diff --stat HEAD
git diff HEAD
git ls-files --others --exclude-standard
```

Read each changed or new file in its entirety — not just the diff.

## Step 3: Analyze for Issues

For each changed file, look for:

**1. Logic Errors**
- Off-by-one errors, incorrect conditionals
- Missing error handling, unhandled edge cases
- Race conditions or async issues

**2. Security Issues**
- Exposed secrets or API keys
- SQL/command injection vulnerabilities
- Insecure data handling or missing input validation
- XSS vulnerabilities (frontend)

**3. Performance Problems**
- Unnecessary re-renders (React)
- N+1 queries or redundant API calls
- Memory leaks

**4. Code Quality**
- DRY violations
- Poor naming or overly complex functions
- Missing TypeScript types or `any` usage

**5. Pattern Adherence**
- Follows project conventions from CLAUDE.md
- Consistent with existing codebase style

## Step 4: Verify Issues Are Real

Before reporting, confirm each issue is legitimate:
- Run relevant tests if applicable
- Check if the pattern is intentional based on context

## Step 5: Output Report

Save to `.agents/code-reviews/[descriptive-name].md`

**Format for each issue:**
```
severity: critical | high | medium | low
file: path/to/file.ts
line: 42
issue: [one-line description]
detail: [why this is a problem]
suggestion: [how to fix it]
```

If no issues found: "Code review passed. No technical issues detected."

**Rules:**
- Be specific — line numbers, not vague complaints
- Focus on real bugs, not style preferences (linting handles that)
- Flag security issues as `critical`
- Suggest fixes, don't just identify problems
