---
description: Generate an implementation report for system review
---

> 🌐 **Language:** All user-facing output must match the user's language. Code, paths, and commands stay in English.

Review and document the implementation you just completed. Run this immediately after finishing a feature — before committing or starting the next task.

## Step 1: Gather Implementation Data

```bash
git diff HEAD --stat
git diff HEAD
git ls-files --others --exclude-standard
```

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

### What Went Well

List specific things that worked smoothly:
- [concrete examples]

### Challenges Encountered

List specific difficulties encountered:
- [what was difficult and why]

### Divergences from Plan

For each divergence from the original plan:

**[Divergence Title]**
- **Planned:** [what the plan specified]
- **Actual:** [what was implemented instead]
- **Reason:** [why this divergence occurred]
- **Type:** Better approach found | Plan assumption wrong | Security concern | Performance issue | Other

### Skipped Items

List anything from the plan that was not implemented:
- [what was skipped] — Reason: [why]

### Recommendations

Based on this implementation, what should change for next time?
- Plan command improvements: [suggestions]
- Execute command improvements: [suggestions]
- CLAUDE.md additions: [suggestions]
