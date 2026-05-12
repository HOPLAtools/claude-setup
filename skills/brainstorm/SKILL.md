---
name: brainstorm
description: "Design exploration and brainstorming before planning. Use when the user wants to explore options for a new feature, discuss approaches, design a solution, brainstorm ideas, or evaluate trade-offs. Trigger on: 'new feature', 'brainstorm', 'explore options', 'design', 'how should we', 'what approach', 'trade-offs'. Do NOT use when the user already has a clear plan or is asking to execute existing work."
---

# Brainstorming: Design Exploration Before Planning

## Purpose
Explore the problem space and arrive at a validated design BEFORE creating an implementation plan. Bad planning direction = wasted plans.

## Hard Gate
**Never jump to planning or implementation before the user has approved a design approach.**

## Process

### Step 1: Explore Context
- Read the project's AGENTS.md (or CLAUDE.md as fallback), README, and relevant source files
- Understand the existing architecture, patterns, and conventions
- Identify what already exists that relates to this feature
- Check `.agents/plans/` for any related previous work

### Step 2: Ask Clarifying Questions
Ask questions **one at a time** (don't overwhelm with a list):
- What problem are we solving? Who benefits?
- What does success look like?
- Are there constraints (performance, timeline, tech stack)?
- Are there existing patterns in the codebase we should follow or break from?

Wait for the user's answer before asking the next question.

### Step 3: Propose Approaches
Present **2-3 approaches** with clear trade-offs:

For each approach:
- **Name**: A short descriptive name
- **How it works**: 2-3 sentences
- **Pros**: What's good about this approach
- **Cons**: What's risky or complex
- **Effort estimate**: Low / Medium / High
- **Best when**: Under what conditions this is the right choice

### Step 4: Design the Chosen Approach
Once the user selects an approach:
- Detail the implementation at a conceptual level (not code)
- Identify files that will be created or modified
- Map data flow and component interactions
- Call out edge cases and potential gotchas
- If helpful, offer a visual companion (ASCII diagram, flow chart)

### Step 5: Write Design Document
Save to `.agents/specs/YYYY-MM-DD-<topic>.md` with:
```
# Design: [Feature Name]

## Problem
What we're solving and why

## Chosen Approach
Which approach and why

## Design
Conceptual design details

## Requirements Delta
> **Include only when the feature changes documented system behavior** — i.e. it adds, modifies, or removes a user-visible capability or business rule. Pure refactors, perf fixes, and infra changes can omit this section. The delta is consumed by `/hopla:archive` to fold the change into `.agents/specs/canonical/`.

### ADDED Requirements
- REQ-<DOMAIN>-<NNN>: <short title>
  - Scenario: <name> — Given <state>, When <action>, Then <outcome>

### MODIFIED Requirements
- REQ-<DOMAIN>-<NNN>: <short title> (replaces previous version)
  - <description of how the requirement changes>

### REMOVED Requirements
- REQ-<DOMAIN>-<NNN>: <short title> (deprecated — reason)

## Files Affected
- List of files to create/modify

## Edge Cases & Risks
- Known edge cases
- Risk areas

## Open Questions
- Anything still unclear

## Next Step
Run `/hopla:plan-feature` to create the implementation plan from this design
```

> **Requirement IDs:** use a stable convention like `REQ-<DOMAIN>-<NNN>` (e.g. `REQ-AUTH-002`). The domain prefix should match the canonical spec filename (`auth.md` → `REQ-AUTH-*`). When in doubt about IDs in a brand-new project, leave them as `REQ-AUTH-TBD` and pick numbers when the first canonical spec is created.

### Step 6: Review Loop
Present the design document for user review.
- Accept feedback using the `<? ... >` comment syntax
- Iterate until the user approves
- Only then suggest: "Design approved! Ready to create the plan with `/hopla:plan-feature`?"

## Rules
- Never skip to planning without design approval
- One question at a time — don't overwhelm
- Always ground proposals in the existing codebase (not abstract theory)
- If the feature is trivial (< 30 minutes of work), skip the full process — just confirm approach and proceed
- In planning mode (non-technical users): focus on product decisions, not technical details

## Integration

- If the user hasn't defined requirements yet, suggest: "Before brainstorming, consider running `/hopla:create-prd` to define the product requirements. This gives us clearer constraints to design against."
- If the user is brainstorming a bug fix rather than a new feature, suggest: "This sounds like a bug rather than a new feature. Consider running the `debug` skill for systematic root cause analysis instead."
