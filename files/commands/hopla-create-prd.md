---
description: Create or update the PRD for this project through guided questions
---

Create or update a `PRD.md` for this project following the Layer 1 Planning approach: an exploratory conversation that defines scope, reduces assumptions, and generates both a `PRD.md` and supporting on-demand context documents.

**If a `PRD.md` already exists**, this command will read it first and only ask about what's missing, outdated, or changing — it will not start from scratch.

> Layer 1 Planning = Global Rules + On-Demand Context + PRD

## Step 1: Load Existing Context

Before asking anything, read what already exists:
- `CLAUDE.md` or `AGENTS.md` — extract product name, tech stack, business context
- `README.md` — extract any existing product description
- Any existing `PRD.md` — understand what's already defined and what needs updating

If a `PRD.md` exists, tell the user: "I found an existing PRD. I'll update it rather than start from scratch — only asking about what's missing or has changed."

Use this to avoid asking questions that are already answered.

## Step 2: Detect Project Mode

Before starting the conversation, determine which mode to use based on what exists:

**Greenfield mode** (project is new or nearly empty):
- No significant source code found
- No existing architecture or stack decisions
- Proceed with the full exploratory conversation below

**Existing project mode** (project has code, structure, or a prior PRD):
- Source code, architecture, or stack already exist
- Skip feasibility and stack topics — read the code instead
- Focus the conversation only on gaps: what's undocumented, what's next, what's changing
- Announce to the user: "I can see this project already has code. I'll read the existing structure first and only ask about what's missing or unclear."

---

### Greenfield Mode — Full Exploratory Conversation

Start with an informal, open-ended exploration — not a rigid questionnaire. The goal is to understand the project deeply before structuring anything.

Ask one topic at a time and wait for the answer before continuing. Adapt follow-up questions based on the answers — this is a conversation, not a form.

**Topic A — The Product Vision**
- What is this product? Describe it as if explaining to someone who has never heard of it.
- What problem does it solve? What was the situation before this product existed?
- What is the MVP goal — the minimum that makes this useful?

**Topic B — The Users**
- Who are the primary users? (role, context, technical level)
- How and how often do they use it?

**Topic C — Feasibility & Stack**
- What technology stack are you thinking? Any hard constraints or preferences?
- Are there existing integrations, APIs, or services this must work with?
- What are the biggest technical risks or unknowns?

**Topic D — Scope**
- What are the 3-5 core features the MVP must have?
- What is explicitly OUT of scope for the MVP? (things users might expect but won't be built)

**Topic E — Architecture & Key Decisions**
- What architectural pattern makes sense for this? (e.g., monolith, microservices, vertical slices)
- Are there key technical decisions that need to be made upfront? (e.g., auth approach, data model, tool design)
- Are there external resources, docs, or best practices we should factor in?

**Topic F — Success**
- How do you know the MVP is working well? What are the measurable success criteria?

---

### Existing Project Mode — Documentation Conversation

First, explore the codebase to understand what's already built:

```bash
git ls-files | head -60
git log --oneline -10
```

Read key files: entry points, main modules, config files, existing tests.

Then ask only about what's unclear or missing after reading the code:

**Topic A — Confirm Understanding**
- "Based on what I've read, this project does X using Y. Is that accurate?"
- Correct any misunderstandings before continuing.

**Topic B — Scope Gaps**
- What features are planned but not yet built?
- What is explicitly out of scope going forward?

**Topic C — Users (if not documented)**
- Who uses this? What's their technical level and usage pattern?

**Topic D — Success**
- How do you measure whether this project is working well?

## Step 3: Extract On-Demand Context Documents

After the conversation, identify technical decisions complex enough to warrant their own document. For each one, create a separate file in the project root or a `docs/` folder.

Common examples:
- `mvp-tool-designs.md` — detailed tool/API specifications
- `architecture-decisions.md` — key architectural decisions and rationale
- `data-model.md` — core entities and relationships

These become **on-demand context** referenced from the PRD and used in future planning commands.

## Step 4: Generate the PRD

Write the full PRD content in memory using this structure (it will be saved as a draft in Step 5):

```markdown
# PRD — [Product Name]

## Executive Summary

[2-3 sentences: what it does, who it's for, and why it exists.]

## Mission

[What this product aims to achieve. Include core principles if relevant.]

## Problem

[What problem does this solve? What was the situation before this product?]

## Target Users

**Primary users:** [Role and context]
**Technical level:** [Technical comfort expected]
**Usage pattern:** [How often and in what context they use it]

## MVP Scope

### In Scope
- [Feature/capability 1]
- [Feature/capability 2]
- [Feature/capability 3]

### Out of Scope
- [Thing 1 — why it's excluded]
- [Thing 2 — why it's excluded]

## User Stories

1. **As a [user], I want to [action]**, so that [outcome].
   - Example: "[concrete usage example]"

[Add the most important 3-5 user stories]

## Core Architecture & Patterns

[Describe the chosen architecture, key patterns, and rationale. Reference on-demand context docs for details.]

## Technology Stack

- **[Layer/role]:** [Technology and version]
- **[Layer/role]:** [Technology and version]

## Success Criteria

The MVP is working when:
- [ ] [Specific, testable criterion]
- [ ] [Specific, testable criterion]
- [ ] [Specific, testable criterion]

## Implementation Phases

### Phase 1: [Name] — Goal: [one line]
- [ ] [Deliverable]
- [ ] [Deliverable]
**Validation:** [How to know this phase is done]

### Phase 2: [Name] — Goal: [one line]
[Same structure]

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| [Risk 1] | [How to address it] |
| [Risk 2] | [How to address it] |

## Future Considerations (Post-MVP)

- [Enhancement 1]
- [Enhancement 2]

## Related Documents

- [on-demand context doc] — [what it contains]
```

## Step 5: Save Draft and Enter Review Loop

Do NOT show the full PRD in the chat. Instead:

1. Save the draft to `PRD.draft.md` at the project root
2. Save any on-demand context documents created in Step 3 (also with `.draft` suffix if new)
3. Tell the user:
   > "Draft saved to `PRD.draft.md` — open it in your editor and review it carefully. If you want changes, add comments like `<? change this >` anywhere in the file and tell me 'apply comments'. You can also request changes directly in the chat. When it's ready, say 'done' to create the final file."

**Review loop:** Stay in this loop until the user finalizes:

- If the user says **"apply comments"** (or similar) → scan `PRD.draft.md` for `<? ... >` comments, apply each one, remove the comment tags, update the file, then list what was changed: "Applied 3 changes: [list]. Anything else, or ready to finalize?"
- If the user requests changes in chat → apply them directly to `PRD.draft.md`, then say: "Updated — anything else, or ready to finalize?"
- If the user says the draft is ready (e.g. "looks good", "finalize", "listo") → proceed to Step 6

**Comment format the user can add directly in the draft:**
```
<? your instruction here >
```
Comments can be placed anywhere in the file — inline after a line, or on their own line above a section. Process them in order from top to bottom.

Do not ask clarifying questions about changes — just apply them and confirm what was changed.

## Step 6: Finalize

1. Rename `PRD.draft.md` → `PRD.md` (overwrite if it existed)
2. Rename any `.draft` context documents to their final names
3. Delete all `.draft` files
4. Confirm: "✅ `PRD.md` saved. Run `/hopla-git-commit` to save it to the repository."
