---
name: hopla-code-review
description: Performs a technical code review on recently changed files. Use when the user says "review the code", "code review", "check my code", "look for issues", or asks for feedback on their implementation.
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Perform a technical code review focused on finding real bugs and issues.

## Step 1: Load Context

Read `CLAUDE.md` or `AGENTS.md` to understand project standards and patterns.

If `.agents/guides/` exists, read any guides relevant to the files being reviewed (e.g. `@.agents/guides/api-guide.md` when reviewing API changes). These guides define the expected patterns for specific task types.

If `.agents/guides/review-checklist.md` exists, read it and apply the project-specific checks it defines in addition to the standard checks below. Project-specific checklists cover framework gotchas and domain anti-patterns unique to the project (e.g., AG Grid stale closures, Hono route ordering).

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
- Stale closures — callbacks passed to imperative APIs (grids, charts, maps) that capture stale state instead of using refs or stable references
- Unhandled promise rejections — `.then()` without `.catch()`, async calls without `try/catch` in non-void contexts
- Side effects inside JSX render — mutations of arrays/objects inside `.map()` in JSX (breaks React strict mode, causes double-execution bugs)

**2. Security Issues**
- Exposed secrets or API keys
- SQL/command injection vulnerabilities
- Missing input validation on API endpoints — required fields, format constraints (regex, length), payload size limits
- Insecure data handling — raw user input in queries, responses exposing internal data or stack traces
- XSS vulnerabilities (frontend)

**3. Performance Problems**
- Unnecessary re-renders (React)
- N+1 queries or redundant API calls
- Memory leaks

**4. Code Quality**
- DRY violations — before flagging, search for similar functions/constants elsewhere in the codebase; suggest extraction to a shared module if the same logic exists in multiple places
- Poor naming or overly complex functions
- Missing TypeScript types or `any` usage

**5. Pattern Adherence**
- Follows project conventions from CLAUDE.md
- Consistent with existing codebase style

**6. Route & Middleware Ordering**
- Static routes defined AFTER parameterized routes (e.g., `/users/all` after `/users/:id`) causing shadowing — the parameterized route captures requests meant for the static one
- Middleware applied in incorrect order (e.g., auth after route handler, CORS after response sent)

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

## Next Step

After the review, suggest:
> "Code review saved to `.agents/code-reviews/[name].md`. If issues were found, run `/hopla-code-review-fix .agents/code-reviews/[name].md` to fix them. If the review passed clean, proceed to `/hopla-execution-report`."
