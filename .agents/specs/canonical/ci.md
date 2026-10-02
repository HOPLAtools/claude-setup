# CI

> Current behavior of the system. From `hopla-3-0-0` (archived 2026-10-02).

## Requirements

### REQ-CI-001: CI validates the plugin
- Scenario: invalid frontmatter — Given a skill with an unknown frontmatter field, When CI runs, Then `claude plugin validate --strict skills` fails the job.
