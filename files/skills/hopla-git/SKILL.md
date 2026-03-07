---
name: hopla-git
description: Handles git operations: creating commits, making pull requests, pushing branches. Use when the user asks to commit, create a commit, save changes to git, make a PR, create a pull request, push the branch, or any git workflow action.
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Detect the user's intent and execute the appropriate git workflow.

## Intent Detection

**If the user wants to commit** (keywords: "commit", "save changes", "create commit"):
- Read and follow the instructions in `commit.md` (located in the same directory as this skill)

**If the user wants to create a PR or push** (keywords: "PR", "pull request", "push", "merge request"):
- Read and follow the instructions in `pr.md` (located in the same directory as this skill)

**If unclear**, ask the user one short question: "Commit or Pull Request?"

## File References

The full step-by-step instructions for each workflow are in:
- `~/.claude/skills/hopla-git/commit.md` — conventional commit with Git Flow awareness
- `~/.claude/skills/hopla-git/pr.md` — GitHub PR creation with structured description

Read the relevant file now and follow its instructions completely.
