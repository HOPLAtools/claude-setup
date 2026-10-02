# Deprecation

> Current behavior of the system. From `hopla-3-0-0` (archived 2026-10-02).

## Requirements

### REQ-DEPRECATION-001: Deprecated items notify once per session
- Scenario: repeated use — Given a deprecated skill, When it is invoked twice in the same session, Then the deprecation notice is shown only the first time.

### REQ-DEPRECATION-002: Deprecated agents announce their replacement
- Scenario: agent invoked — Given a session where `hopla:code-reviewer` was not used yet, When Claude invokes it through the Agent tool, Then the user and Claude see one notice naming the `code-review` skill, and the agent still runs.
