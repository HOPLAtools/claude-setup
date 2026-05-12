---
name: code-review
description: "Technical code review on changed files. Use when the user says 'review code', 'code review', 'check my code', 'review changes', 'look for bugs', or 'audit code'. Also use after completing implementation when validation passes. Do NOT use for reviewing plans or documents — only code."
triggers:
  - "review (my |the |this )?code"
  - "code review"
  - "audit (my |the |this )?code"
  - "look for bugs"
allowed-tools: Read, Grep, Glob, Bash
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Perform a technical code review focused on finding real bugs and issues.

## Step 1: Load Context

Read `CLAUDE.md` or `AGENTS.md` to understand project standards and patterns.

If `.agents/guides/` exists, read any guides relevant to the files being reviewed (e.g. `@.agents/guides/api-guide.md` when reviewing API changes). These guides define the expected patterns for specific task types.

If `.agents/guides/review-checklist.md` exists, read it and apply the project-specific checks it defines in addition to the standard checks. Project-specific checklists cover framework gotchas and domain anti-patterns unique to the project (e.g., grid stale closures, route ordering).

## Step 2: Identify Changed Files

```bash
git diff --stat HEAD
git diff HEAD
git ls-files --others --exclude-standard
```

Read each changed or new file in its entirety — not just the diff.

## Step 3: Analyze for Issues

Apply the full checklist in `checklist.md` (same directory). It covers:

1. Logic errors (stale closures, unhandled rejections, missing deps)
2. Security (secrets, injection, input validation, multi-tenant auth)
3. Performance (N+1, re-renders, memory leaks)
4. Code quality (DRY, naming, types)
5. Pattern adherence (project conventions)
6. Route & middleware ordering

Read `checklist.md` before reviewing so you apply every category.

## Step 4: Verify Issues Are Real

Before reporting, confirm each issue is legitimate:
- Run relevant tests if applicable
- Check if the pattern is intentional based on context

## Step 5: Output Report

Save to `.agents/code-reviews/[descriptive-name].md`.

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

> "Code review saved to `.agents/code-reviews/[name].md`. If issues were found, run `/hopla:code-review-fix .agents/code-reviews/[name].md` to fix them. If the review passed clean, proceed to the `execution-report` skill."
