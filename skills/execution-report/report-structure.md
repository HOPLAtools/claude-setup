# Execution Report Structure

Fill every section. Write "Not applicable" rather than leaving a section blank — empty sections make it unclear whether the check was performed.

## Meta Information

- **Plan file:** [path to the plan that guided this implementation]
- **Files added:** [list with paths]
- **Files modified:** [list with paths]
- **Lines changed:** +X −Y

## Validation Results

- Syntax & Linting: ✓/✗ [details if failed]
- Type Checking: ✓/✗ [details if failed]
- Unit Tests: ✓/✗ [X passed, Y failed]
- Integration Tests: ✓/✗ [X passed, Y failed]

## Code Review Findings

- **Code review file:** [path to `.agents/code-reviews/[name].md`, or "Not run"]
- **Issues found:** [count by severity: X critical, Y high, Z medium, W low]
- **Issues fixed before this report:** [count]
- **Key findings:** [1-2 sentence summary of the most significant issues found]

## What Went Well

List specific things that worked smoothly:

- [concrete examples]

## Challenges Encountered

List specific difficulties:

- [what was difficult and why]

## Bugs Encountered

Categorize each bug found during implementation:

| Bug | Category | Found By | Severity |
|-----|----------|----------|----------|
| [description] | stale closure / validation / race condition / styling / scope mismatch / type error / route ordering / other | lint / types / tests / code review / manual testing | critical / high / medium / low |

If no bugs were encountered, write "No bugs encountered during implementation."

## Divergences from Plan

For each divergence:

**[Divergence Title]**

- **Planned:** [what the plan specified]
- **Actual:** [what was implemented instead]
- **Reason:** [why this divergence occurred]
- **Type:** Better approach found | Plan assumption wrong | Security concern | Performance issue | Other

## Scope Assessment

- **Planned tasks:** [number in the original plan]
- **Executed tasks:** [number actually completed]
- **Unplanned additions:** [count and brief description of work not in the original plan]
- **Scope accuracy:** On target | Under-scoped (took more work than planned) | Over-scoped (simpler than expected)

## Skipped Items

List anything from the plan that was not implemented:

- [what was skipped] — Reason: [why]

## Technical Patterns Discovered

New gotchas, patterns, or conventions learned during this implementation that should be documented:

- **Pattern/Gotcha:** [description]
- **Where it applies:** [what type of feature or context triggers this]
- **Ready-to-paste AGENTS.md / CLAUDE.md entry:** [Write the EXACT text that should be added to the project's AGENTS.md (or CLAUDE.md for legacy projects) to prevent this gotcha in future features. Format it as a bullet point under the appropriate section. If it belongs in a guide instead, write the exact text for the guide. Do not write vague suggestions like "document this" — write the actual content so the system reviewer can apply it directly.]

If nothing new was discovered, write "No new patterns discovered."

## Recommendations

Based on this implementation, what should change for next time?

- Plan command improvements: [suggestions]
- Execute command improvements: [suggestions]
- AGENTS.md / CLAUDE.md additions: [suggestions]
