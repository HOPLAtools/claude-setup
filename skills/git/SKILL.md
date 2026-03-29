---
name: git
description: "Git operations handler for commits and pull requests. Use when the user mentions 'commit', 'save changes', 'create commit', 'PR', 'pull request', 'push', 'merge request', or any git workflow action. Do NOT use for git status checks or branch management — only for commits and PRs."
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
- `commit.md` (in this skill's directory) — conventional commit with Git Flow awareness
- `pr.md` (in this skill's directory) — GitHub PR creation with structured description

Read the relevant file now and follow its instructions completely.
