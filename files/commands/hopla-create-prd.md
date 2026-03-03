---
description: Create a Product Requirements Document (PRD) for a project through guided questions
---

Create a PRD for this project by gathering the necessary information through a structured conversation.

## Step 1: Gather Context

Before asking questions, read what already exists:
- `CLAUDE.md` or `AGENTS.md` — extract product name, tech stack, and any business context
- `README.md` — extract any existing product description

Use this to avoid asking questions that are already answered.

## Step 2: Ask Key Questions

Ask the following questions **one section at a time** — do not dump all questions at once. Wait for the answer before continuing.

**Section A — The Product**
1. In 1-2 sentences, what does this product do?
2. What problem does it solve? What was happening before this product existed?

**Section B — The Users**
3. Who are the primary users? (role, context, technical level)
4. How do they use it? (daily, weekly, ad-hoc?)

**Section C — Scope**
5. What are the 3-5 most important features the product must have?
6. What is explicitly OUT of scope? (things users might expect but won't be built)

**Section D — Success**
7. How do you know the product is working well? (key outcomes or metrics)

## Step 3: Generate the PRD

Once all questions are answered, generate the PRD and save it to `PRD.md` at the project root.

Use this structure:

---

```markdown
# PRD — [Product Name]

## What is it?

[2-3 sentence executive summary. What it does, who it's for, and why it exists.]

## Problem

[What problem does this solve? What was the situation before this product?]

## Users

**Primary users:** [Role and context]
**Usage pattern:** [How often and in what context they use it]

## Core Features (In Scope)

- [Feature 1 — one line description]
- [Feature 2 — one line description]
- [Feature 3 — one line description]
[Add as many as needed]

## Out of Scope

These are explicitly NOT part of this product:
- [Thing 1 — why it's excluded]
- [Thing 2 — why it's excluded]

## Success Criteria

The product is working well when:
- [Measurable outcome 1]
- [Measurable outcome 2]
```

---

## Step 4: Confirm and Save

Show the draft PRD to the user and ask:
> "Does this accurately reflect the product? Any corrections before I save it?"

Once confirmed, save to `PRD.md` and suggest running `/commit` to add it to the repository.
