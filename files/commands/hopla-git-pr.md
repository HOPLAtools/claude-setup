---
description: Create a GitHub Pull Request with a structured description
argument-hint: "[optional: base branch, defaults to develop]"
---

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

**If `$1` is provided**, use it as the base branch.

**Otherwise, infer from Git Flow branch naming:**

| Current branch prefix | Base branch |
|---|---|
| `feature/*` | `develop` or `dev` |
| `fix/*` | `develop` or `dev` |
| `hotfix/*` | `main` |
| `release/*` | `main` |

To resolve `develop` vs `dev`: run `git branch -r` and look for `origin/develop` or `origin/dev`. Use whichever exists.

**Guard rails:**
- If the current branch is `main`, `master`, `develop`, or `dev` → stop and warn: "You're on `[branch]` — PRs should come from feature branches."
- If the branch name doesn't match any Git Flow prefix → ask the user: "I can't determine the base branch from `[branch]`. Should this PR target `develop` or `main`?"
- **Always show the resolved base branch in Step 5** so the user can catch mistakes before the PR is created.

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

After the user confirms the PR was approved and merged on GitHub, run the cleanup workflow based on the branch type:

### For feature and fix branches (merged to `dev`/`develop`):

```bash
git checkout [base-branch]
git pull origin [base-branch]
git branch -d [merged-branch]
git push origin --delete [merged-branch] 2>/dev/null  # skip if GitHub already deleted it
```

**Important:** When `dev` is merged to `main` via PR, do NOT pull `main` back into `dev` — `dev` already has all the commits. Only sync `main` → `dev` for hotfix/release branches (see below).

### Additional steps for `hotfix/*` and `release/*` ONLY:

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

**Always confirm each destructive action** (branch deletion, tag creation) before executing.
