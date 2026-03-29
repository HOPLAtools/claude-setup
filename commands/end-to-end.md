# End-to-End Feature Implementation

> Execute the complete PIV loop for a feature in one go: prime → brainstorm → plan → review → execute → validate → commit.

> ⚠️ **Advanced**: Only use this command after you've proven each individual command works reliably. Build trust gradually.

## Input
- `$ARGUMENTS`: Feature description or requirement

## Autonomy Levels

This command represents **Level 3 autonomy**. Make sure you've mastered:
- Level 1: Manual prompts (writing everything each time)
- Level 2: Individual commands (/hopla-plan-feature, /hopla-execute, etc.)
- Level 3: Command chaining (this command)

## Process

### Phase 1: Context Loading
Load project context:
- Read CLAUDE.md, README, package.json
- Check git state (branch, status, pending plans)
- Identify current development phase

### Phase 2: Brainstorm (if needed)
If the feature is non-trivial (estimated > 1 hour):
- Explore 2-3 approaches with trade-offs
- Get user approval on approach
- Save design doc to `.agents/specs/`

If trivial: skip to Phase 3.

### Phase 3: Plan
- Research codebase for related patterns
- Generate structured implementation plan
- Save to `.agents/plans/[feature-name].md`

### 🔒 GATE: Plan Review
**STOP and present the plan to the user.**
- Show executive summary
- Wait for explicit approval before proceeding
- If changes requested: iterate on the plan

### Phase 4: Execute
- Create feature branch (`feature/[name]` from develop)
- Execute all plan tasks sequentially
- Validate after each phase boundary

### Phase 5: Validate
- Run full validation pyramid (lint → types → tests → integration)
- Run code review
- Fix any critical/important issues found

### 🔒 GATE: Human Review
**STOP and present results to the user.**
- Show what was built, what was validated
- Wait for approval before committing

### Phase 6: Commit & PR
- Create conventional commit(s)
- Suggest creating a PR if on a feature branch

## Rules
- Never skip the human gates (plan review, final review)
- If any phase fails, stop and report — don't push through
- Each phase should feel like a natural conversation, not a script
- Adapt: skip brainstorming for small features, skip PR for hotfixes
