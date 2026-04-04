# Hopla Git Commit — Full Workflow

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Review the current git state and create an appropriate conventional commit.

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

## Step 5: Version Bump (if configured)

Before committing, check the project's `CLAUDE.md` for a `## Versioning` section. If it exists:

1. Read the versioning configuration (command, trigger, files)
2. Check if the **trigger condition** matches (e.g., specific branches, always, etc.)
3. If it matches, run the version bump command
4. Stage the version files alongside the other changes

If no `## Versioning` section exists in the project's `CLAUDE.md`, skip this step entirely.

## Step 6: Execute Commit

Once approved, create the commit:

```bash
git commit -m "<type>(<scope>): <description>"
```

## Step 7: Push Reminder

After committing, remind the user:

> "Commit created locally. Do you want to push to `origin/<branch>`?"

**Never push automatically** — wait for explicit confirmation.

If the user confirms the push (or if the branch was already pushed), suggest:
> "Ready to create a Pull Request? Run `/hopla-git-pr` to create one."
