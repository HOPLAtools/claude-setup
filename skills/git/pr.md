# Hopla Git PR — Full Workflow

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Create a Pull Request on GitHub for the current branch.

## Step 1: Gather Context

```bash
git status
git branch --show-current
git log --oneline origin/$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null | sed 's|.*/||' || echo 'develop')..HEAD
git diff --stat origin/$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null | sed 's|.*/||' || echo 'develop')..HEAD
```

Read the following if they exist:
- The plan file in `.agents/plans/` related to this feature
- `CLAUDE.md` — for project context

## Step 2: Determine Base Branch

**If the user specified a base branch**, use it.

**Otherwise**, resolve it using `flow-detection.md` (same directory):

1. Detect the branching model and `$DEFAULT_BASE` (Step 1 of flow-detection.md)
2. Map the current branch prefix → base branch (Step 2 of flow-detection.md)
3. Verify the resolved base exists remotely (Step 4 of flow-detection.md)
4. Apply the standard warnings (Step 5 of flow-detection.md)

**Always show the resolved base branch in Step 5** so the user can catch mistakes before the PR is created.

Also detect if you are inside a worktree (Step 3 of flow-detection.md) — this is needed for post-merge cleanup in Step 7.

## Step 3: Check Push Status

```bash
git status
```

If the branch hasn't been pushed yet:
> "Branch not pushed yet. Push to origin first?"

Wait for confirmation before pushing:
```bash
git push -u origin <branch>
```

## Step 4: Build PR Description

Using the commits and plan context, draft:

**Title:** `[type(scope)]: short description` — match the main commit or feature name, max 70 chars

**Body:**
```markdown
## Summary
- [What was built — 2-3 bullets max]

## Changes
- [Key files modified and why]

## Test Plan
- [ ] [How to verify this works]
- [ ] [Edge cases to check]

## Related
- Plan: `.agents/plans/[feature-name].md` (if exists)
```

## Step 5: Propose and Confirm

Show the proposed PR title and body to the user:
> "Proposed PR:
> Title: `[title]`
> Base: `[base branch]`
> [body preview]
> Shall I create it?"

Wait for explicit approval before creating.

## Step 6: Create PR

```bash
gh pr create --title "[title]" --body "[body]" --base [base-branch]
```

After creating, show the PR URL to the user.

**Never merge automatically** — the PR is for human review.

After showing the PR URL, suggest:
> "PR created. To complete the cycle, run `/hopla-execution-report` (if not done yet) and `/hopla-system-review` after the PR is merged."

## Step 7: Post-Merge Cleanup

After the user confirms the PR was approved and merged on GitHub, detect whether the branch lives in a worktree and run the appropriate cleanup.

### Detect worktree

Apply Step 3 of `flow-detection.md`:

```bash
GIT_DIR=$(git rev-parse --git-dir)
GIT_COMMON_DIR=$(git rev-parse --git-common-dir)
MAIN_REPO=$(dirname "$GIT_COMMON_DIR")
```

If `GIT_DIR` ≠ `GIT_COMMON_DIR`, the branch is in a worktree — use **Path A**. Otherwise use **Path B**.

### Path A — Cleanup from a worktree

Capture the worktree path before moving out:

```bash
WORKTREE_PATH=$(git rev-parse --show-toplevel)
cd "$MAIN_REPO"

git checkout [base-branch]
git pull origin [base-branch]

git worktree remove "$WORKTREE_PATH"
git branch -d [merged-branch]
git push origin --delete [merged-branch] 2>/dev/null  # skip if GitHub already deleted it
```

If `git worktree remove` fails because the tree has uncommitted work, stop and ask the user — do **not** pass `--force` without explicit confirmation.

### Path B — Cleanup from the main repo

```bash
git checkout [base-branch]
git pull origin [base-branch]
git branch -d [merged-branch]
git push origin --delete [merged-branch] 2>/dev/null  # skip if GitHub already deleted it
```

**Important:** When `dev` is merged to `main` via PR, do NOT pull `main` back into `dev` — `dev` already has all the commits. Only sync `main` → `dev` for hotfix/release branches (see below).

### Additional steps for `hotfix/*` and `release/*`

These branches were merged to `main` but `develop` also needs the changes:

```bash
git checkout develop
git pull origin develop
git merge main
git push origin develop
```

Then create a version tag:

```bash
git tag -a v[version] -m "Release [version]"
git push origin v[version]
```

Ask the user for the version number before tagging.

**Always confirm each destructive action** (branch deletion, worktree removal, tag creation) before executing.
