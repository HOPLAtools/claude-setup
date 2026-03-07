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

- If `$1` is provided, use it as the base branch
- Otherwise default to `develop` (or `dev` if that's what the project uses)
- If on `main` or `develop` directly, warn the user: "You're on `[branch]` — PRs should come from feature branches."

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
