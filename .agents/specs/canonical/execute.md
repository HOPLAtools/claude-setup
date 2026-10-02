# Execute

> Current behavior of the system. From `hopla-3-2-0` (archived 2026-10-02).

## Requirements

### REQ-EXECUTE-001: Independent plan tasks run as a workflow
- Scenario: three independent tasks — Given a plan with 3 tasks on disjoint files and no cross-references, When the user runs `/hopla:execute` and approves the workflow, Then the three tasks are implemented and verified by parallel agents and the validation pyramid runs in the main session afterwards.
- Scenario: declined — Given the same plan, When the user declines the workflow dialog, Then execute runs the tasks sequentially.
