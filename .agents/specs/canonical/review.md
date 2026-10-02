# Code review

> Current behavior of the system. From `hopla-3-1-0` (archived 2026-10-02).

## Requirements

### REQ-REVIEW-001: Code review wraps the native review and adds a checklist pass
- Scenario: project checklist — Given `.agents/guides/review-checklist.md` with a rule the diff breaks, When the user runs `/hopla:code-review`, Then the native review runs and the saved report also lists the checklist finding with `source: checklist`.
- Scenario: clean review — Given a diff with no issues, When the review runs, Then `.agents/code-reviews/<name>.md` is still written and says the review passed.
- Scenario: committed work — Given phases already committed on a branch, When `/hopla:code-review <branch>` runs, Then the committed changes are reviewed too.

### REQ-REVIEW-002: Findings carry a confidence and low-confidence ones are dropped
- Scenario: weak finding — Given a finding scored 60, When the report is saved, Then it appears only under "Dropped (low confidence)".

### REQ-REVIEW-003: Review with fixes
- Scenario: --fix — Given a diff with a confirmed bug, When the user runs `/hopla:code-review --fix`, Then the bug is fixed and the report marks it `outcome: fixed`.
