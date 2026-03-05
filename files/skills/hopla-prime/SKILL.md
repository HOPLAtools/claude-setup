---
name: hopla-prime
description: Orients Claude in a project at the start of a session. Use when the user says "orient yourself", "get oriented", "prime yourself", "ponte al día", "qué es este proyecto", "what is this project", "load context", or asks Claude to familiarize itself with the codebase before starting work.
---

Get oriented in this project before doing any work.

## Step 1: Project Structure

Use the Glob tool to list project files (up to 60):
- Pattern: `**/*` with head_limit: 60

Use the Glob tool to find key config files:
- `**/CLAUDE.md`
- `**/AGENTS.md`
- `**/README.md`

## Step 2: Read Key Files

Read in this order:
1. `CLAUDE.md` or `AGENTS.md` at project root (project-specific rules)
2. `README.md` (project overview)
3. `package.json` or `pyproject.toml` (dependencies and scripts)

## Step 3: Understand Git State

```bash
git branch --show-current
git log --oneline -10
git status
```

## Step 4: Check Pending Work

Use the Glob tool to check for pending plans:
- Pattern: `.agents/plans/*.md`

If `.agents/plans/` exists, identify:
- `.draft.md` files — unfinished drafts waiting for review
- `.md` files (without `.draft`) — finalized plans ready to execute

## Step 5: Summary Report

Write a short, conversational message addressed directly to the user. Mention:
- What the project is and what it does
- The current branch and what it's for
- Whether there are uncommitted changes or pending work
- The command to start the project (if available)

If there are pending plans, list them clearly after the prose summary:
```
Pending plans:
- inventory-page.draft.md ← draft, not finalized yet
- add-user-authentication.md ← ready to execute with /hopla-execute
```

End with a sentence like: "Listo para continuar — ¿por dónde empezamos?" or "All caught up — what are we working on today?" depending on the language the user writes in.

Do NOT use headers in the prose summary. Write it as natural, friendly prose, then the pending plans list if applicable.
