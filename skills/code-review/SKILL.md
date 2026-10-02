---
name: code-review
description: "Technical code review on changed files, focused on finding real bugs and issues."
when_to_use: "Use when the user says 'review code', 'review my code', 'review the code', 'code review', 'check my code', 'check these changes', 'review changes', 'look for bugs', 'audit code' or 'audit my code'. Also use after completing implementation when validation passes. Do NOT use for reviewing plans or documents — only code."
argument-hint: "[low|medium|high|max] [--fix]"
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Review the changed code by wrapping Claude Code's native `/code-review`, add a checklist pass it does not do, keep only confident findings, and always save the report.

Arguments (`$ARGUMENTS`, both optional, any order): an effort level (`low`, `medium`, `high`, `max`) and `--fix`.

## Step 1: Load Context

- Read `AGENTS.md` (or `CLAUDE.md`) for project standards.
- Check whether `.agents/guides/review-checklist.md` exists (the project checklist). If it does, read it.
- Effort: the level given in the arguments, else **medium**. If the project checklist exists, **never `low`** (at `low` the native review reported nothing in testing): use `medium` instead and say so.

## Step 2: Native Review

Invoke the **Skill tool** with skill `code-review` — the built-in native review; the bare name resolves to it — and args `<effort>` plus `--fix` when it was requested. **Never invoke `hopla:code-review`** (that is this skill: it would recurse).

Let it finish. It reports its findings through `ReportFindings` (file, line, summary, failure scenario; with `--fix` it also applies its fixes). Keep that list: these are the `source: native` findings.

If the Skill tool is unavailable or the native review fails, say so in the report and continue with Step 3 on the full diff (`git diff HEAD`, plus untracked files from `git ls-files --others --exclude-standard`).

## Step 3: Checklist Pass

The native review does not read project checklists. Review the same changed files against:

1. `checklist.md` (same directory as this skill) — every category.
2. `.agents/guides/review-checklist.md`, if it exists.

Read each changed file in full, not just the diff. Report only issues the native review did not already report: same file, line within ±3 and the same problem is a **duplicate** — drop it. These are the `source: checklist` findings.

## Step 4: Severity and Confidence

For **every** finding (native and checklist):

- **Severity:** `critical` = security (secrets, injection, auth) or data loss · `high` = breaks behavior · `medium` = edge case or fragile code · `low` = minor.
- **Confidence (0–100):** 0 = false positive · 25 = might be real · 50 = real but minor or a nit · 75 = verified and important · 100 = certain, with evidence (a test, a trace, the exact input that fails).

Before scoring, verify: run the relevant test or trace the input when you can, and check whether the pattern is intentional.

Keep findings with confidence **≥ 80**. The rest go to a "Dropped (low confidence)" section, one line each — never silently discarded.

## Step 5: Fixes (only with `--fix`)

The native review already applied its fixes in Step 2. Fix the kept `source: checklist` findings yourself, then mark every kept finding `outcome: fixed` or `outcome: skipped` (with a short reason).

## Step 6: Save the Report

Save to `.agents/code-reviews/<plan-slug>.md` when the changes implement a plan (`<plan-slug>` = plan filename without `.md`, so `/hopla:archive` and `hopla-claude-setup status` find it), else `.agents/code-reviews/[descriptive-name].md`. Save it even when no issues are found — the file is the evidence that the review ran.

Header: effort used, whether the native review ran, whether a project checklist was applied, counts (kept / dropped). Then each kept finding, most severe first:

```
severity: critical | high | medium | low
confidence: 0-100
source: native | checklist
file: path/to/file.ts
line: 42
issue: [one-line description]
detail: [why this is a problem, with evidence]
suggestion: [how to fix it]
outcome: fixed | skipped — [reason]   (only with --fix)
```

Then `## Dropped (low confidence)` with one line per dropped finding (`file:line — issue (confidence N)`).

If nothing is kept, the file says: "Code review passed. No technical issues detected." (and still lists any dropped findings).

## Next Step

After the review, suggest:

> "Code review saved to `.agents/code-reviews/[name].md`. If issues were found, fix them or run `/hopla:code-review --fix` (it reviews again and applies the fixes). If the review passed clean, proceed to the `execution-report` skill."
