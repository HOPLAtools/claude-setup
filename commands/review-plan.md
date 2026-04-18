---
description: Review a plan before execution — get a concise summary and approve or request changes
argument-hint: "<plan-file-path>"
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Review the implementation plan and give the executing developer a clear, concise summary before they commit to running it.

## Step 1: Read the Plan

Read `$1` entirely before doing anything else.

## Step 2: Present Executive Summary

Do NOT reproduce the full plan. Instead, present a structured summary:

**Plan: [Feature Name]**

**What is being built:**
[2-3 sentences max — what the feature does and why]

**Tasks ([N] total):**
| # | Action | File | Risk |
|---|--------|------|------|
| 1 | create/modify/delete | `path/to/file` | ⚠️ gotcha if any / — |
| 2 | ... | ... | ... |

**Files touched:** [count] files — [list key ones]

**Validation plan:**
- [ ] [exact lint command]
- [ ] [exact type check command]
- [ ] [exact test command]
- [ ] [integration check]

**Acceptance criteria:**
- [ ] [criterion 1]
- [ ] [criterion 2]

**⚠️ Watch out for:**
[List any gotchas, risks, or dependencies flagged in the plan. If none, say "Nothing flagged."]

## Step 3: Ask for Approval

After the summary, ask (in the user's language):
> "All clear? You can approve to execute, request changes, or ask questions about any task."

**Review loop:**
- If the user has questions → answer them based on the plan content
- If the user requests changes → note them and suggest re-running `/hopla:plan-feature` to update the plan, or apply minor clarifications directly if they are unambiguous
- If the user approves → confirm: "✅ Plan approved. Run `/hopla:execute $1` to start."
