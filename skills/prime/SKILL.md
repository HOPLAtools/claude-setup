---
name: prime
description: "Project orientation and context loading: summarizes the project, its git state and pending plans."
when_to_use: "Use when starting a session, onboarding to a project, or needing to understand the codebase, or when the user says 'orient', 'orient yourself', 'catch me up', 'get context', 'load project', 'what is this project', 'prime'. Do NOT use mid-task when the project is already understood."
allowed-tools: Read, Grep, Glob, Bash
context: fork
agent: hopla:codebase-researcher
model: haiku
background: false
---

> **Runs as a forked subagent:** you cannot see the conversation and cannot ask the user anything. Do the steps below, then return the summary from Step 5 as your final answer. Write it in English unless the project's AGENTS.md/CLAUDE.md asks for another language; the main assistant relays it to the user in the user's language. Code, paths, and commands stay in English.

Get oriented in this project before doing any work.

## Step 1: Project Structure

Use the Glob tool to list project files (up to 60):
- Pattern: `**/*` with head_limit: 60

Use the Glob tool to find key config files:
- `**/AGENTS.md`
- `**/CLAUDE.md`
- `**/README.md`

## Step 2: Read Key Files

Read in this order:
1. `AGENTS.md` or `CLAUDE.md` at project root (project-specific rules — AGENTS.md is canonical when both exist; CLAUDE.md may be a thin `@AGENTS.md` alias)
2. `README.md` (project overview)
3. `package.json` or `pyproject.toml` (dependencies and scripts)

## Step 3: Understand Git State

```bash
git branch --show-current
git log --oneline -10
git status
```

## Step 4: Check Pending Work

Resolve `<plans-dir>`: `<plans-dir>` is the `- Plans: <dir>` line under `## HOPLA` in `AGENTS.md` (else `CLAUDE.md`), default `.agents/plans/`. Use the Glob tool to check for pending plans:
- Pattern: `<plans-dir>/*.md`

Also read `.agents/hopla-active-plan.json` if it exists (the plan being executed and its current step).

If `<plans-dir>` exists, identify:
- `.draft.md` files — unfinished drafts waiting for review
- `.md` files (without `.draft`) — finalized plans ready to execute

## Step 5: Summary Report (your final answer)

Return a short, conversational summary (under ~250 words) addressed to the user. The main assistant relays it as-is (translated to the user's language when needed), so make it self-contained. Mention:
- What the project is and what it does
- The current branch and what it's for
- Whether there are uncommitted changes or pending work
- The command to start the project (if available)

If there are pending plans, list them clearly after the prose summary:
```
Pending plans:
- inventory-page.draft.md ← draft, not finalized yet
- add-user-authentication.md ← ready to execute with /hopla:execute
```

End with a sentence like: "All caught up — what are we working on today?"

Do NOT use headers in the prose summary. Write it as natural, friendly prose, then the pending plans list if applicable.
