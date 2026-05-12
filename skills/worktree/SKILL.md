---
name: worktree
description: "Git worktree management for isolated feature development with Git Flow awareness. Use when starting a new feature that benefits from isolation, when the user says 'worktree', 'isolated branch', 'parallel development', or when implementing multiple features simultaneously. Do NOT use for quick fixes or single-file changes."
---

# Git Worktrees — Isolated Development with Git Flow

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

## What are worktrees?

Git worktrees create separate working directories for different branches while sharing the same git history. Each worktree is an independent workspace.

## When to use

- Starting a feature that should be isolated from other work
- Developing multiple features in parallel
- Needing a clean baseline to test against
- Working on a risky change that might need to be abandoned

## Setup Process

### Step 1: Identify branch type and resolve base branch

Ask the user (or infer from context) which type of branch to create:

| Prefix | Purpose | Base (Git Flow) | Base (GitHub Flow) |
|---|---|---|---|
| `feature/*` | New functionality | `develop` / `dev` | `main` |
| `fix/*` | Non-urgent bug fix | `develop` / `dev` | `main` |
| `hotfix/*` | Urgent production fix | `main` | `main` |
| `release/*` | Release candidate | `main` | N/A — ask user |

Use `../git/flow-detection.md` (Steps 1–2) to resolve the base branch from the prefix. Confirm it exists remotely (Step 4).

**Guard rails:**

- **Refuse** to create a `hotfix/*` worktree from `develop`/`dev`. Hotfixes must come from `main` — correct the base before proceeding.
- If the prefix is unknown, ask the user which base to use.
- Always show the resolved base to the user before executing `git worktree add`.

### Step 2: Choose worktree directory

Check in order:

1. Existing `.worktrees/` or `worktrees/` directory
2. `AGENTS.md` / `CLAUDE.md` preference (if configured)
3. Ask the user (default: `worktrees/<kebab-name>`)

### Step 3: Ensure the worktree directory is gitignored

```bash
grep -q "^worktrees/" .gitignore 2>/dev/null || echo "worktrees/" >> .gitignore
```

### Step 4: Create the worktree from the correct base

Fetch first so the local base tracks the remote:

```bash
git fetch origin <base-branch>
git worktree add worktrees/<name> -b <prefix>/<name> origin/<base-branch>
```

Examples:

```bash
# Feature off develop
git worktree add worktrees/auth -b feature/auth origin/develop

# Hotfix off main
git worktree add worktrees/crash-fix -b hotfix/crash-fix origin/main

# Fix on GitHub Flow project
git worktree add worktrees/typo -b fix/typo origin/main
```

### Step 5: Install project dependencies (if applicable)

Auto-detect from the project root — run only what matches:

- `package-lock.json` → `npm install`
- `yarn.lock` → `yarn install`
- `pnpm-lock.yaml` → `pnpm install`
- `requirements.txt` → `pip install -r requirements.txt`
- `pyproject.toml` with `poetry.lock` → `poetry install`
- `Cargo.toml` → `cargo build`
- `go.mod` → `go mod download`

If none match, skip.

### Step 6: Verify clean baseline (optional)

If `AGENTS.md` / `CLAUDE.md` or `package.json` defines a test command, run it once inside the worktree to confirm the baseline is green. If no test command is defined, skip.

If tests fail **before any changes**, STOP and report — the baseline is broken.

### Step 7: Work in the worktree

All work for this branch happens in `worktrees/<name>/`. Use the `git` skill from inside the worktree directory for commits and PRs — it detects the worktree context automatically.

## Cleanup

Post-merge cleanup is handled by the `git` skill — see `../git/pr.md` Step 7. It detects the worktree and runs `git worktree remove` automatically.

If the branch is **abandoned** before merge, confirm with the user and then:

```bash
cd "$(dirname "$(git rev-parse --git-common-dir)")"  # back to main repo
git worktree remove --force worktrees/<name>
git branch -D <prefix>/<name>
```

## Integration

- Combine with `/hopla:execute` — run execution from inside the worktree
- Combine with the `git` skill — commit and PR from inside the worktree; cleanup happens post-merge
- Combine with parallel dispatch — multiple worktrees active simultaneously
