---
description: Research the codebase and create a structured implementation plan from requirements
argument-hint: "<feature-name-or-description>"
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Transform the requirements discussed in this conversation into a structured plan that another agent can execute without access to this conversation.

## Phase 1: Understand the Requirements

Review the current conversation to extract:
- What feature or change is being requested?
- What is the expected behavior from the user's perspective?
- Are there any explicit constraints or preferences mentioned?
- What is out of scope?

If anything is ambiguous, ask clarifying questions **before** proceeding to research.

## Phase 2: Load Project Context

Read the following to understand the project:

1. `CLAUDE.md` or `AGENTS.md` at project root — architecture rules, patterns, constraints
2. `README.md` — project overview and setup
3. `package.json` or `pyproject.toml` — stack, dependencies, scripts
4. `.agents/guides/` — if this directory exists, read any guides relevant to the feature being planned (e.g. `@.agents/guides/api-guide.md` when planning an API endpoint)
5. `MEMORY.md` (if it exists at project root or `~/.claude/`) — check for user preferences that affect this feature (UI patterns like modal vs inline, keyboard shortcuts, component conventions)

Then run:

```bash
git branch --show-current
git log --oneline -10
git status
```

## Phase 3: Research the Codebase

Investigate the areas of the codebase relevant to this feature:

- Find existing files and modules related to the feature
- Identify the patterns already used (naming, structure, data flow)
- Locate similar features already implemented to use as reference
- Find the entry points that will need to be modified or extended
- Identify potential conflicts or dependencies

Use the Grep tool to find relevant files (pattern: relevant keyword, case-insensitive).

Read the key files in their entirety — not just the parts that seem relevant.

### Data audit (required for features that consume existing data)

Follow the full checklist in `.agents/guides/data-audit.md`.

**Your responsibility as planner:** Run the complete audit and document ALL findings in the plan's **Context References** and **Gotchas** fields. The executing agent must be able to verify your findings without re-auditing — they should only confirm that what you documented still holds.

## Phase 4: Design the Approach

Based on research, define:
- What files will be created vs. modified
- What pattern to follow (based on existing codebase conventions)
- What the data flow looks like end-to-end
- Any risks, edge cases, or gotchas to flag
- What tests are needed
- **Derived/computed values:** If any value is calculated from other fields, specify the exact formula including how stored values are interpreted (sign, units, semantics), AND how derived values propagate when inputs change (event system, reactivity, polling, etc.)

## Phase 5: Generate the Plan

Write the full plan in memory using the structure below, then save it as a draft (do NOT output the plan content in the chat).

Use this structure:

---

```markdown
# Plan: [Feature Name]

## Overview
[2-3 sentences describing what this feature does and why]

## Requirements Summary
- [Bullet list of requirements extracted from the discussion]

## Out of Scope
- [Anything explicitly excluded]

## Context References
Key files the executing agent must read before starting:
- `[path/to/file]` — [why it's relevant]
- `[path/to/file]` — [why it's relevant]

## Implementation Tasks

> All fields are required. Use `N/A` if a field does not apply — never leave a field blank.

### Task 1: [Action verb + what]
- **Action:** create | modify | delete
- **File:** `[exact file path — no vague references like "the component"]`
- **Pattern:** `[exact reference file to follow]` — or `N/A` if no existing pattern
- **Details:** [Step-by-step description of what to implement]
- **Gotcha:** [Known pitfall or constraint] — or `N/A`
- **Validate:** [Exact command or check to confirm this task is done correctly]

#### For tasks that create or modify API endpoints, also include:
- **Validation:** [Required fields, input limits, format constraints (e.g. "IMEI must be exactly 15 digits")]
- **Error UX:** [What the user sees when this operation fails (e.g. "toast.error with message", "inline error under field")]

### Task 2: [Action verb + what]
[Same structure — all 6 fields required]

[Continue for all tasks...]

## Test Tasks

> Every plan must include at least one task that creates or updates tests. If the feature is purely UI with no testable logic, specify which interactions to verify manually and why automated tests are not applicable.

## Validation Checklist

Run in this order — do not proceed if a level fails:

- [ ] **Level 1 — Lint & Format:** `[project lint command]`
- [ ] **Level 2 — Type Check:** `[project type check command]`
- [ ] **Level 2.5 — Code Review:** Run `/hopla-code-review` on changed files
- [ ] **Level 3 — Unit Tests:** `[project unit test command]`
- [ ] **Level 4 — Integration Tests:** `[project integration test or manual curl/check]`
- [ ] **Level 5 — Human Review:** Verify behavior matches requirements above

## Acceptance Criteria
- [ ] [Specific, testable criterion]
- [ ] [Specific, testable criterion]
- [ ] [Specific, testable criterion]

## Notes for Executing Agent
[Any important context, warnings, or decisions made during planning that the executing agent needs to know]
```

---

## Phase 6: Verify the Plan

Before saving the draft, review the plan against these criteria:

- [ ] Every task has a specific file path (no vague "update the component")
- [ ] Every task has: Action, File, Pattern, Details, Gotcha, Validate — no field left empty
- [ ] Validation Checklist has **exact commands** from `CLAUDE.md` or `package.json` (not vague "run lint")
- [ ] The plan is complete enough that another agent can execute it without this conversation
- [ ] No ambiguous requirements left unresolved
- [ ] **Data audit complete:** All data sources audited per `.agents/guides/data-audit.md`, with all findings (null cases, value semantics, derived value propagation) documented in Context References and Gotchas
- [ ] **Working references specified:** Every framework-specific pattern references a proven working implementation with extracted API calls, prop types, and data flow — not just "see file X"
- [ ] **API validation specified:** Every task that creates/modifies an API endpoint includes Validation (required fields, limits, format) and Error UX (what the user sees on failure)
- [ ] **Test coverage:** At least one task creates or updates tests — or a justification is provided for why tests are not applicable
- [ ] **User preferences checked:** MEMORY.md was consulted for UI preferences (modal vs inline, keyboard shortcuts, component conventions) that affect the plan

## Phase 7: Save Draft and Enter Review Loop

**Before saving, identify the target file:**

1. List all files in `.agents/plans/` (both `*.draft.md` and `*.md`)
2. Determine the target filename from the feature name derived in Phase 1: `[kebab-case-feature-name].draft.md`
3. If a file with that name already exists → **overwrite it**
4. If a file with a similar name exists (e.g. same feature, slight variation) → **overwrite it and confirm which file was updated**
5. Never create versioned files (e.g. `-v2`, `-updated`, `-new`) — always update in place

**Save and notify:**

1. Save the plan to `.agents/plans/[kebab-case-feature-name].draft.md`
2. Tell the user:
   > "Plan draft saved to `.agents/plans/[feature-name].draft.md` — open it in your editor and review it carefully. If you want changes, add comments like `<? change this >` anywhere in the file and tell me 'apply comments'. You can also request changes directly in the chat. When it's ready, say 'done' to create the final file."
3. Also mention:
   - How many tasks are in the plan
   - Any open questions or decisions that require human input before execution

**Review loop:** Stay in this loop until the user finalizes:
- If the user says **"apply comments"** → identify the active draft (the one saved in this session, or ask if unclear), scan it for `<? ... >`, apply each one, remove the comment tags, update the file, report what changed
- If the user requests changes in chat → apply directly to the active draft, confirm the filename and what changed
- If the user references a specific plan file (e.g. passes a path) → treat that file as the active draft
- If the user says the plan is ready → proceed to finalize

**Finalize:**
1. Rename `.agents/plans/[feature-name].draft.md` → `.agents/plans/[feature-name].md` (overwrite if it already exists)
2. Confirm: "✅ Plan saved to `.agents/plans/[feature-name].md`. Run `/hopla-git-commit` to commit it, then share with the team to execute with `/hopla-execute .agents/plans/[feature-name].md`."
