---
name: hopla-worktree
description: "Git worktree management for isolated feature development. Use when starting a new feature that benefits from isolation, when the user says 'worktree', 'isolated branch', 'parallel development', or when implementing multiple features simultaneously. Do NOT use for quick fixes or single-file changes."
---

# Git Worktrees for Isolated Development

## What Are Worktrees?
Git worktrees create separate working directories for different branches, sharing the same git history. Each worktree is an independent workspace.

## When to Use
- Starting a feature that should be isolated from other work
- Developing multiple features in parallel
- Needing a clean baseline to test against
- Working on a risky change that might need to be abandoned

## Setup Process

### Step 1: Choose Worktree Directory
Check in order:
1. Existing `.worktrees/` or `worktrees/` directory
2. CLAUDE.md preference (if configured)
3. Ask the user

### Step 2: Ensure Directory is Gitignored
```bash
# Verify the worktree directory is in .gitignore
grep -q "worktrees" .gitignore || echo "worktrees/" >> .gitignore
```

### Step 3: Create Worktree
```bash
# Create worktree with a new feature branch
git worktree add worktrees/feature-name -b feature/feature-name
```

### Step 4: Setup Project in Worktree
Auto-detect and run setup:
- **Node.js**: `npm install` or `yarn install`
- **Python**: `pip install -r requirements.txt` or `poetry install`
- **Rust**: `cargo build`
- **Go**: `go mod download`

### Step 5: Verify Clean Baseline
```bash
cd worktrees/feature-name
# Run tests to ensure baseline is green
npm test  # or equivalent
```

If tests fail before any changes, STOP and report — the baseline is broken.

### Step 6: Work in the Worktree
All work for this feature happens in `worktrees/feature-name/`.

## Cleanup

### After Merge
```bash
git worktree remove worktrees/feature-name
git branch -d feature/feature-name
```

### If Abandoned
```bash
git worktree remove --force worktrees/feature-name
git branch -D feature/feature-name
```

## Integration
- Use with `/hopla-execute` for isolated feature implementation
- Use with `/hopla-git-pr` for creating PRs from the worktree branch
- Combine with parallel dispatch for multiple features simultaneously
