---
description: Create a conventional commit with Git Flow awareness
argument-hint: "[optional: commit message or scope]"
---

Review the current git state and create an appropriate commit.

## Step 1: Gather Context

Run these commands to understand what changed:

```bash
git status
git diff --staged
git diff
git log --oneline -5
```

## Step 2: Analyze Changes

- Identify what was added, modified, or deleted
- Determine the appropriate commit type: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`
- Identify the scope if relevant (e.g., `auth`, `api`, `ui`)
- Check current branch — confirm it follows Git Flow naming (`feature/`, `fix/`, `hotfix/`, `develop`, `dev`)

## Step 3: Stage Files

Stage only the relevant files for this commit (avoid `git add -A` unless all changes belong together):

```bash
git add <specific files>
```

## Step 4: Propose Commit

Present the proposed commit message to the user **before executing**:

> "Proposed commit:
> `feat(products): add price filter to search endpoint`
>
> Files included: [list files]
> Shall I proceed?"

Wait for explicit approval before running `git commit`.

## Step 5: Execute Commit

Once approved, create the commit:

```bash
git commit -m "<type>(<scope>): <description>"
```

## Step 6: Push Reminder

After committing, remind the user:

> "Commit created locally. Do you want to push to `origin/<branch>`?"

**Never push automatically** — wait for explicit confirmation.
