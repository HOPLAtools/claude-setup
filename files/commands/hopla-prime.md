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

Write a short, conversational message (2-4 sentences) addressed directly to the user. Mention:
- What the project is and what it does
- The current branch and what it's for
- Whether there are uncommitted changes or pending work
- The command to start the project (if available)

End with a sentence like: "Listo para continuar — ¿por dónde empezamos?" or "All caught up — what are we working on today?" depending on the language the user writes in.

Do NOT use headers, labels, or bullet points in this final message. Write it as natural, friendly prose.
