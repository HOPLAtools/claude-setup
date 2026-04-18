---
name: execution-report
description: "Post-implementation documentation generator. Use when the user says 'generate report', 'document what was done', 'execution report', 'what changed', or after a feature implementation is complete and validated. Do NOT use during implementation — only after completion."
allowed-tools: Read, Grep, Glob, Bash
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Review and document the implementation you just completed. Run this immediately after finishing a feature — before committing or starting the next task.

## Step 1: Gather Implementation Data

```bash
git diff HEAD --stat
git diff HEAD
git ls-files --others --exclude-standard
```

Also check for recent code reviews:

```bash
ls -t .agents/code-reviews/ 2>/dev/null | head -5
```

If a code review exists for this feature, note its path for the Code Review Findings section.

## Step 2: Generate the Report

Save to: `.agents/execution-reports/[feature-name].md`.

Use the full structure documented in `report-structure.md` (same directory). It covers:

- Meta information (plan file, files added/modified, lines changed)
- Validation results
- Code review findings
- What went well
- Challenges encountered
- Bugs encountered (with categorization table)
- Divergences from plan
- Scope assessment
- Skipped items
- Technical patterns discovered (with ready-to-paste CLAUDE.md entry)
- Recommendations

Read `report-structure.md` before writing so every section is filled correctly.

## Next Step

After the report is saved, suggest:

> "Execution report saved to `.agents/execution-reports/[name].md`. Use the `git` skill (say 'commit') to save your changes."
