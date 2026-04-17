# Git Flow Detection — Shared Reference

> Shared by the `git` skill (`commit.md`, `pr.md`), the `worktree` skill, and the `execute` command. Keep the logic here and reference it from callers — do not duplicate.

## Step 1: Detect the branching model

```bash
git branch -r
```

Resolve `$DEFAULT_BASE`:

- `origin/develop` exists → **Git Flow**, `$DEFAULT_BASE = develop`
- Else `origin/dev` exists → **Git Flow**, `$DEFAULT_BASE = dev`
- Else only `origin/main` / `origin/master` → **GitHub Flow**, `$DEFAULT_BASE = main` (or `master`)

## Step 2: Map branch prefix → base branch

| Branch prefix | Base (Git Flow) | Base (GitHub Flow) |
|---|---|---|
| `feature/*` | `$DEFAULT_BASE` | `main` |
| `fix/*` | `$DEFAULT_BASE` | `main` |
| `hotfix/*` | `main` | `main` |
| `release/*` | `main` | N/A — ask the user |

**Edge cases:**

- Branch does not match a known prefix → ask the user which base to use
- Current branch is `main`/`master`/`develop`/`dev` → stop and warn; commits and PRs must come from a feature/fix/hotfix/release branch
- `hotfix/*` on a Git Flow project but base resolved to `develop` → **refuse** and correct to `main`

## Step 3: Detect worktree context

```bash
GIT_DIR=$(git rev-parse --git-dir)
GIT_COMMON_DIR=$(git rev-parse --git-common-dir)
```

- `GIT_DIR` ≠ `GIT_COMMON_DIR` → you are **inside a worktree**
- Else you are in the **main repo**

List all active worktrees when useful for the user:

```bash
git worktree list
```

The main repo path is:

```bash
MAIN_REPO=$(dirname "$(git rev-parse --git-common-dir)")
```

## Step 4: Verify the resolved base exists remotely

```bash
git show-ref --verify --quiet refs/remotes/origin/$BASE || echo "missing"
```

If missing, ask the user before proceeding.

## Step 5: Standard warnings

Emit these to the user when applicable:

- On `main`/`develop`/`dev`: "You're on `$BRANCH` — this is a base branch. Commits and PRs should come from feature branches."
- Unknown prefix: "Branch `$BRANCH` does not match `feature/`, `fix/`, `hotfix/`, or `release/`. Which base branch should it target?"
- Hotfix from wrong base: "`hotfix/*` must branch from `main`, not `$DETECTED_BASE`. Refusing to proceed — recreate the branch from `main`."
