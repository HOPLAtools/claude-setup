---
description: Load project context at the start of a session
---

Get oriented in this project before doing any work.

## Step 1: Project Structure

```bash
git ls-files | head -60
```

```bash
find . -name "CLAUDE.md" -o -name "AGENTS.md" -o -name "README.md" | head -10
```

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

## Step 4: Summary Report

Provide a concise summary with:

**Project:** [name and purpose in one sentence]
**Stack:** [languages, frameworks, key libraries]
**Current branch:** [branch name and what it's for]
**Key structure:** [main folders and their purpose]
**Useful commands:** [how to run, test, build]
**Git status:** [clean / changes pending / uncommitted files]

Keep it scannable — this is for human review in under 30 seconds.
