---
description: Analyze implementation against plan to find process improvements
argument-hint: "<plan-file> <execution-report-file>"
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Perform a meta-level analysis of how well the implementation followed the plan. This is NOT code review — you're looking for bugs in the process, not the code.

## Inputs

- **$1** — Path to the structured plan file
- **$2** — Path to the execution report file

## Step 0: Check for Existing Review

Before doing anything else, check if a system review already exists for this plan:

```bash
ls .agents/system-reviews/
```

Look for a file that matches the feature name derived from **$1** (the plan filename). If a matching review exists:
- Skip Steps 1–6
- Notify the user: "✅ A system review already exists at `.agents/system-reviews/[feature]-review.md`. If you haven't closed the lifecycle yet, run `/hopla:archive $1` to fold delta-specs into canonical specs and move the plan to `done/`."
- Exit.

If no matching review exists, continue with Step 1.

---

## Step 1: Load All Context

Read these artifacts in order:

0. `.agents/system-reviews/` — Read ALL previous system review files (if any exist) to identify recurring patterns. Pay special attention to: bug categories that appear across multiple reviews, process improvement suggestions that were made before but not yet applied, and alignment score trends (improving or declining).
1. `.claude/commands/plan-feature.md` — understand how plans are created
2. **$1** (the plan) — what the agent was supposed to do
3. `.claude/commands/execute.md` — understand how execution is guided
4. **$2** (the execution report) — what the agent actually did and why

## Step 2: Understand the Planned Approach

From the plan ($1), extract:
- What features were planned?
- What architecture was specified?
- What validation steps were defined?
- What patterns or constraints were referenced?

## Step 3: Understand the Actual Implementation

From the execution report ($2), extract:
- What was actually implemented?
- What diverged from the plan?
- What challenges were encountered?
- What was skipped and why?

## Step 4: Classify Each Divergence

For each divergence, classify as:

**Good Divergence ✅** (justified):
- Plan assumed something that didn't exist in the codebase
- Better pattern discovered during implementation
- Performance optimization was needed
- Security issue required a different approach

**Bad Divergence ❌** (problematic):
- Ignored explicit constraints from the plan
- Created new architecture instead of following existing patterns
- Took shortcuts that introduce tech debt
- Misunderstood requirements

## Step 5: Trace Root Causes

For each problematic divergence, identify the root cause:
- Was the plan unclear? Where and why?
- Was context missing? Where and why?
- Was a validation step missing?
- Was a manual step repeated that should be automated?

## Step 5.5: Cross-Review Pattern Detection

If previous system reviews exist in `.agents/system-reviews/`, compare the current findings against them:

### Recurring Bug Patterns
For each bug category in this implementation, check if the same category appeared in previous reviews. If a pattern appears 3+ times:
- Flag it as a **systemic issue** that needs a structural fix (not just a process note)
- Suggest adding it to `.agents/guides/review-checklist.md` as a project-specific check
- Example: "Stale closure bugs found in 3 of last 5 implementations → add to review checklist"

### Unresolved Improvements
Cross-reference improvement suggestions from previous reviews. If a suggestion was made before and NOT yet applied:
- Check if the suggested AGENTS.md / CLAUDE.md update was made
- Check if the suggested command update was made
- Check if the suggested guide was created
- List any improvements that were suggested 2+ reviews ago and are still pending

## Step 6: Generate Process Improvements

Suggest specific actions based on patterns found:

- **AGENTS.md updates** (or `CLAUDE.md` for legacy projects) — universal patterns or anti-patterns to document
- **Plan command updates** — instructions that need clarification or missing steps
- **Execute command updates** — steps to add to the execution checklist
- **New commands** — manual processes repeated 3+ times that should be automated

## Step 6.5: Standard pattern codes (cross-project tracking)

When you detect a pattern in the current review that matches one of the standard codes below, tag the divergence with the corresponding `Rxx` code in the review output. This keeps the pattern catalogue consistent across reviews and across consumer projects so trends (counts, recurrence) are comparable.

The standard codes below come from cross-review trend analysis. Consumer projects may also define their own project-specific codes (`R1`–`R8` are typically defined per-project in their own `AGENTS.md` or `.agents/guides/review-checklist.md`) — keep those untouched and append the standard codes as needed.

- **R6 — UX iteration budget declared (MANDATORY when visible UI is introduced).** Did the plan declare `Expected UX iterations: N` for any task that adds or modifies a visible component? See `commands/plan-feature.md` Phase 4 for the rule. Missing declaration → tag `R6`.
- **R9 — Workflow classification (async vs sequential).** Did the plan classify each workflow as `async data-arrival` vs `sequential user-driven` BEFORE specifying reactive-effect-based mutations (React `useEffect`, Vue `watch`, Svelte `$effect`, RxJS subscriptions, message handlers, etc.)? See `commands/plan-feature.md` Phase 4 for the rule. Sequential workflows specified as reactive effect chains → tag `R9`.
- **R10 — Empirical verification of "out-of-scope" claims.** Did the plan document the exact verification command used to confirm negative claims ("X is not available, so it's out of scope")? The command depends on the claim type — database CLI for SQL claims, `curl` for HTTP, `grep` for source code, etc. See `commands/plan-feature.md` Phase 3 for the rule. Unverified deferrals → tag `R10`.
- **R11 — Call-chain trace for "automatic side effect" claims.** Did the plan document the full call chain (file:line for each link) when asserting that a side effect happens automatically? See `commands/plan-feature.md` Phase 3 for the rule. Partial or missing traces → tag `R11`.

When a divergence matches more than one code, list all that apply. When it matches none, no code is needed — describe the pattern in prose.

## Output Format

Save to: `.agents/system-reviews/[feature-name]-review.md`

---

### Meta Information
- Plan reviewed: [path to $1]
- Execution report: [path to $2]
- Date: [current date]

### Overall Alignment Score: __/10

- **10** — Perfect adherence, all divergences justified
- **7–9** — Minor justified divergences
- **4–6** — Mix of justified and problematic divergences
- **1–3** — Major problematic divergences

### Divergence Analysis

For each divergence:
```yaml
divergence: [what changed]
planned: [what plan specified]
actual: [what was implemented]
reason: [agent's stated reason]
classification: good ✅ | bad ❌
root_cause: [unclear plan | missing context | missing validation | other]
```

### Pattern Compliance
- [ ] Followed codebase architecture
- [ ] Used patterns documented in AGENTS.md / CLAUDE.md
- [ ] Applied testing patterns correctly
- [ ] Met validation requirements

### System Improvement Actions

**Update AGENTS.md (or CLAUDE.md for legacy projects):**
- [ ] [specific addition or change]

**Update Plan Command:**
- [ ] [specific addition or change]

**Update Execute Command:**
- [ ] [specific addition or change]

**Create New Command:**
- [ ] `/[command-name]` — [what it automates]

### Key Learnings

**What worked well:** [specific things]
**What needs improvement:** [specific process gaps]
**For next implementation:** [concrete changes to try]

### Cross-Review Trends (if previous reviews exist)

- **Recurring bug categories:** [list categories that appeared in 2+ reviews, with count — e.g., "stale closures: 3 occurrences"]
- **Improvement backlog:** [list suggestions from previous reviews not yet applied]
- **Alignment trend:** [list last 3–5 alignment scores with feature names, e.g., "parse-cache: 10, multi-org: 6, colors: 7"]
- **Systemic issues:** [patterns appearing 3+ times that need structural fixes, not just process notes]

---

## Decision Framework — When to Update What

After the analysis, use this to prioritize actions:

| Pattern | Action |
|---|---|
| Issue happens across ALL features | Update AGENTS.md (or CLAUDE.md) |
| Issue happens for a CLASS of features | Update on-demand reference guide or command |
| Same manual step done 3+ times | Create a new command |
| Plan was ambiguous in the same spot twice | Update plan-feature command |
| First time seeing this issue | Note it, don't over-engineer yet |

## Step 7: Suggest Next

Do **not** move or delete any files. The lifecycle closure (moving the plan to `done/`, folding delta-specs into canonical specs, deleting the ephemeral code review) is the responsibility of `/hopla:archive`.

Notify the user:
> "✅ System review saved to `.agents/system-reviews/[feature]-review.md`. To close the lifecycle of this plan, run `/hopla:archive $1` — it will fold any delta-specs into the canonical specs and move the plan to `done/`."
