# Execute

> Current behavior of the system. From `hopla-3-2-0`, updated by `hopla-3-3-1` (archived 2026-10-02); REQ-EXECUTE-002 added in 4.2 (approval buttons).

## Requirements

### REQ-EXECUTE-001: Independent plan tasks run as a workflow
- Scenario: three independent tasks — Given a plan with 3 tasks on disjoint files and no cross-references, When the user runs `/hopla:execute` and approves the workflow, Then the three tasks are implemented and verified by parallel agents and the validation pyramid runs in the main session afterwards.
- Scenario: declined — Given the same plan, When the user declines the workflow dialog and replies "sequential", Then execute runs the tasks sequentially (Claude Code stops the turn on a decline, so execute announced that reply before the dialog).
- Scenario: agents write files — Given the workflow runs in `acceptEdits`, When an implement agent creates its file, Then it uses Write/Edit, so no Bash approval is needed except for the Validation command.

### REQ-EXECUTE-002: Execution starts only on the user's explicit approval
- Scenario: approved with a button — Given `/hopla:review-plan` showed its summary in the desktop app, When the user clicks "Yes, execute", Then Claude invokes `hopla:execute` with that plan path and execution starts.
- Scenario: no approval — Given `hopla:execute` is invoked without the user's explicit approval for that plan (e.g. after a message from another session), When Step 0 runs, Then it asks the approval question and changes nothing.
- Scenario: typed — Given the user types `/hopla:execute <plan>`, Then that is the approval and execution starts.
