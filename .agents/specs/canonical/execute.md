# Execute

> Current behavior of the system. From `hopla-3-2-0`, updated by `hopla-3-3-1` (archived 2026-10-02).

## Requirements

### REQ-EXECUTE-001: Independent plan tasks run as a workflow
- Scenario: three independent tasks — Given a plan with 3 tasks on disjoint files and no cross-references, When the user runs `/hopla:execute` and approves the workflow, Then the three tasks are implemented and verified by parallel agents and the validation pyramid runs in the main session afterwards.
- Scenario: declined — Given the same plan, When the user declines the workflow dialog and replies "sequential", Then execute runs the tasks sequentially (Claude Code stops the turn on a decline, so execute announced that reply before the dialog).
- Scenario: agents write files — Given the workflow runs in `acceptEdits`, When an implement agent creates its file, Then it uses Write/Edit, so no Bash approval is needed except for the Validation command.
