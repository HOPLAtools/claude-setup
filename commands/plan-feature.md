---
description: Research the codebase and create a structured implementation plan from requirements
argument-hint: "<feature-name-or-description>"
---

> 💡 **Tip**: Activate Plan Mode (`Shift+Tab` twice) before running this command for deeper codebase exploration. For complex features, use Extended Thinking for better reasoning.

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
- **DRY check:** Before specifying new utility functions, constants, or helpers in the plan, search for existing implementations that can be reused or extended. DRY violations were the #1 code review finding across 28 implementations.

Use the Grep tool to find relevant files (pattern: relevant keyword, case-insensitive).

Read the key files in their entirety — not just the parts that seem relevant.

### Data audit (required for features that consume existing data)

Follow the full checklist in `.agents/guides/data-audit.md`.

**Your responsibility as planner:** Run the complete audit and document ALL findings in the plan's **Context References** and **Gotchas** fields. The executing agent must be able to verify your findings without re-auditing — they should only confirm that what you documented still holds.

**Column removal audit:** When a plan removes a database column, run `grep -r 'column_name' worker/src/` (or equivalent for the project's backend) and include ALL locations in the plan's task list. Do not rely on memory or a single file — columns are often referenced in helper functions, auto-create logic, and ensure-drafts flows across multiple route files. Document the exact count of locations found.

## Phase 4: Design the Approach

Based on research, define:
- What files will be created vs. modified
- What pattern to follow (based on existing codebase conventions)
- What the data flow looks like end-to-end
- Any risks, edge cases, or gotchas to flag
- What tests are needed
- **Derived/computed values:** If any value is calculated from other fields, specify the exact formula including how stored values are interpreted (sign, units, semantics), AND how derived values propagate when inputs change (event system, reactivity, polling, etc.)
- **Interaction states & edge cases:** For features involving interactive UI (forms, grids, keyboard navigation, wizards, CLI interactions), define a matrix of user interactions and their expected behavior. Cover: all keyboard shortcuts (both directions — e.g., Tab AND Shift+Tab), state transitions (empty → editing → saved → error), and boundary conditions (first item, last item, empty list, maximum items). This prevents iterative fix rounds that consumed up to 40% of session time in past implementations.
- **API input validation:** For every API endpoint being created or modified, specify: required fields, field format constraints (e.g., "IMEI must be exactly 15 digits"), payload size limits, and what the user sees on validation failure. This was the #2 most common gap in past plans — validation was only added after code review in 4 of 7 implementations.
- **Bidirectional data interactions:** If feature A updates data that feature B displays, does B need to react? If adding an item triggers validation, does editing trigger re-validation? Map all data mutation → side effect chains, not just keyboard navigation. Missed bidirectional interactions were a recurring planning blind spot.
- **AI/LLM prompt tasks:** If the plan involves creating or modifying AI prompts (system prompts, prompt templates, LLM-based features), add an explicit task for testing against real data with 2-3 iteration cycles budgeted. AI prompt engineering rarely works on the first attempt.
- **User preferences check:** Before specifying UI architecture (modal vs. inline, page vs. panel, dialog vs. drawer), verify against MEMORY.md and conversation history for established preferences. In past implementations, plans that specified modals were rejected because the user preferred inline panels — this caused rework. When no preference exists, note it as a decision point for the user to confirm.
- **Reuse context analysis:** When a new view reuses an existing component in a different context (e.g., a list component in a "history" view vs. an "active" view), the plan MUST list what's different about the new context's requirements: different columns, different data filters, different interactions, different toolbar layout. Missed context differences caused 40%+ of unplanned work in past implementations.
- **Multi-phase plan guidance:** For features requiring 3+ phases, create an architectural plan (`backlog/NN-feature.md`) with schema, phase boundaries, and target architecture. When executing each phase, create a standalone plan (`phase-NX-description.md`) with full task-level detail following this template. The architectural plan is the spec; phase plans are the execution instructions. Each phase should have its own feature branch and PR.
- **API surface enumeration (security/access control plans):** When the plan modifies access control, authorization, or data visibility, enumerate ALL API surfaces that serve the same data — REST endpoints, WebSocket handlers, Durable Object methods, and any other data paths. Each surface must be updated consistently. In past implementations, updating only the WebSocket path while missing the parallel REST endpoint caused a security gap that was only caught by code review. Add a task for each surface, not just the primary one.

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

## Likely Follow-ups
[Features or changes naturally adjacent to this work that the user may request during or after execution. Historical data: 71% of sessions had scope expansion. Listing these upfront helps the executing agent handle them via the Scope Guard rather than improvising.]
- [Follow-up 1]
- [Follow-up 2]

## Git Strategy
- **Base branch:** `[develop | dev | main — specify which branch to create the feature branch from]`
- **Feature branch:** `feature/[kebab-case-name]`

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
- **Time-box:** [Optional — for tasks with known technical risk, specify a maximum time and fallback. E.g., "30 min max. If auto-sizing doesn't work, fall back to fixed widths." Omit for straightforward tasks.]

#### For tasks that create or modify API endpoints, also include:
- **Validation:** [Required fields, input limits, format constraints (e.g. "IMEI must be exactly 15 digits")]
- **Error UX:** [What the user sees when this operation fails (e.g. "toast.error with message", "inline error under field")]

### Task 2: [Action verb + what]
[Same structure — all 6 required fields, plus optional Time-box]

[Continue for all tasks...]

## Interaction Matrix (if applicable)

> Include this section when the feature involves interactive UI (grids, forms, keyboard navigation, drag-and-drop, wizards). Skip for pure backend/API features.

| Action | Context | Expected Behavior |
|--------|---------|-------------------|
| [e.g., Tab] | [e.g., Last editable cell in row] | [e.g., Move to first cell of next row] |
| [e.g., Escape] | [e.g., While editing a cell] | [e.g., Cancel edit, restore previous value] |

Include: keyboard shortcuts (forward AND reverse), mouse interactions, state transitions, boundary conditions (first/last item, empty state, maximum items).

## Test Tasks

> Every plan must include at least one task that creates or updates tests. If the feature is purely UI with no testable logic, specify which interactions to verify manually and why automated tests are not applicable.

> **Regression check:** If this feature modifies existing interactive functionality (editing flows, keyboard navigation, API endpoints with existing consumers), include a task to smoke-test the existing behavior AFTER implementation. In past implementations, changes to shared utilities broke existing interactions that weren't covered by the plan's task list.

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

## Confidence Score: __/10

- **Strengths:** [What is clear and well-understood]
- **Uncertainties:** [What might change or is not fully known]
- **Mitigations:** [How uncertainties will be handled]

Scoring guide:
- 10: Everything is clear, patterns exist, no unknowns
- 7-9: Minor unknowns but mitigations identified
- 4-6: Significant unknowns or missing patterns
- 1-3: High risk, major assumptions unverified

## Notes for Executing Agent
[Any important context, warnings, or decisions made during planning that the executing agent needs to know]

> **UI Styling Note:** UI styling specifications (colors, sizes, variants, labels, spacing) are `[provisional]` proposals. Historical data shows these change in 50%+ of implementations based on user feedback. Implement as specified but do not over-invest in pixel-perfect adherence — expect iteration.
```

---

### Plan Size Check

After generating the plan, count the implementation tasks (excluding test tasks):

- **3–7 tasks:** Optimal size. Proceed as-is.
- **8–11 tasks:** Consider grouping tasks into logical phases with intermediate commit points. Add a `## Phase Boundaries` section to the plan listing where commits should happen.
- **12+ tasks:** The plan should be split into multiple plans or phased with mandatory intermediate commits. Historical data: plans with 12+ tasks scored 6/10 alignment vs 10/10 for 3–7 task plans. Add phase boundaries and consider whether independent task groups can be separate plans.

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
- [ ] **Confidence score justified:** Score is provided with specific strengths, uncertainties, and mitigations
- [ ] **Git strategy specified:** Base branch and feature branch are defined in `## Git Strategy`
- [ ] **Interaction matrix included:** If the feature involves interactive UI, the `## Interaction Matrix` section is filled out — or explicitly marked as N/A with justification
- [ ] **Time-box on risky tasks:** Any task involving unfamiliar libraries, heuristic parsing, or known-complex behavior (auto-sizing, animation, real-time sync) has a Time-box with a fallback strategy
- [ ] **Plan size checked:** If >8 tasks, phase boundaries are defined with intermediate commit points. If >12 tasks, split justification is provided or phases are created.
- [ ] **Likely follow-ups listed:** If the Out of Scope section has items, the Likely Follow-ups section is populated with naturally adjacent work the user may request
- [ ] **API surface enumeration (if security/access plan):** All parallel API surfaces (REST, WebSocket, DO) that serve the same data are listed with a task for each

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
2. Confirm: "✅ Plan saved to `.agents/plans/[feature-name].md`. Run `/hopla-review-plan .agents/plans/[feature-name].md` to review it, then `/hopla-execute .agents/plans/[feature-name].md` to implement it."
