---
name: execution-report
description: "Post-implementation documentation generator. Use when the user says 'generate report', 'document what was done', 'execution report', 'what changed', or after a feature implementation is complete and validated. Do NOT use during implementation — only after completion."
allowed-tools: Read, Grep, Glob, Bash
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Review and document the implementation you just completed. Run this immediately after finishing a feature — before committing or starting the next task.

## Step 1: Gather Implementation Data

```bash
git diff HEAD --stat
git diff HEAD
git ls-files --others --exclude-standard
```

Also check for recent code reviews:

```bash
ls -t .agents/code-reviews/ 2>/dev/null | head -5
```

If a code review exists for this feature, note its path for the Code Review Findings section below.

## Step 2: Generate Report

Save to: `.agents/execution-reports/[feature-name].md`

Use the following structure:

---

### Meta Information

- **Plan file:** [path to the plan that guided this implementation]
- **Files added:** [list with paths]
- **Files modified:** [list with paths]
- **Lines changed:** +X -Y

### Validation Results

- Syntax & Linting: ✓/✗ [details if failed]
- Type Checking: ✓/✗ [details if failed]
- Unit Tests: ✓/✗ [X passed, Y failed]
- Integration Tests: ✓/✗ [X passed, Y failed]

### Code Review Findings

- **Code review file:** [path to `.agents/code-reviews/[name].md`, or "Not run"]
- **Issues found:** [count by severity: X critical, Y high, Z medium, W low]
- **Issues fixed before this report:** [count]
- **Key findings:** [1-2 sentence summary of the most significant issues found]

### What Went Well

List specific things that worked smoothly:
- [concrete examples]

### Challenges Encountered

List specific difficulties encountered:
- [what was difficult and why]

### Bugs Encountered

Categorize each bug found during implementation:

| Bug | Category | Found By | Severity |
|-----|----------|----------|----------|
| [description] | stale closure / validation / race condition / styling / scope mismatch / type error / route ordering / other | lint / types / tests / code review / manual testing | critical / high / medium / low |

If no bugs were encountered, write "No bugs encountered during implementation."

### Divergences from Plan

For each divergence from the original plan:

**[Divergence Title]**
- **Planned:** [what the plan specified]
- **Actual:** [what was implemented instead]
- **Reason:** [why this divergence occurred]
- **Type:** Better approach found | Plan assumption wrong | Security concern | Performance issue | Other

### Scope Assessment

- **Planned tasks:** [number of tasks in the original plan]
- **Executed tasks:** [number of tasks actually completed]
- **Unplanned additions:** [count and brief description of work not in the original plan]
- **Scope accuracy:** On target | Under-scoped (took more work than planned) | Over-scoped (simpler than expected)

### Skipped Items

List anything from the plan that was not implemented:
- [what was skipped] — Reason: [why]

### Technical Patterns Discovered

New gotchas, patterns, or conventions learned during this implementation that should be documented:

- **Pattern/Gotcha:** [description]
- **Where it applies:** [what type of feature or context triggers this]
- **Ready-to-paste CLAUDE.md entry:** [Write the EXACT text that should be added to the project's CLAUDE.md to prevent this gotcha in future features. Format it as a bullet point under the appropriate section. If it belongs in a guide instead, write the exact text for the guide. Do not write vague suggestions like "document this" — write the actual content so the system reviewer can apply it directly.]

If nothing new was discovered, write "No new patterns discovered."

### Recommendations

Based on this implementation, what should change for next time?
- Plan command improvements: [suggestions]
- Execute command improvements: [suggestions]
- CLAUDE.md additions: [suggestions]

## Next Step

After the report is saved, suggest:
> "Execution report saved to `.agents/execution-reports/[name].md`. Run the `git` skill (say "commit") to commit your changes."
