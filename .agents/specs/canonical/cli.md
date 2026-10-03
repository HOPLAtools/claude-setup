# CLI

> Current behavior of the system. From `hopla-3-4-0` (archived 2026-10-03).

## Requirements

### REQ-CLI-001: Optional cost settings
- Scenario: fresh settings — Given a settings.json without the keys, When the user runs `hopla-claude-setup --setup-settings`, Then `workflowKeywordTriggerEnabled` is false and `env.CLAUDE_CODE_SUBAGENT_MODEL` is "sonnet"; Given they are already set, Then nothing changes and the keys are reported.

### REQ-CLI-002: Opt-in high-risk guard
- Scenario: install and remove — Given no guard, When the user runs `--setup-guard`, Then `~/.claude/hooks/high-risk-guard.js` exists and a PreToolUse Bash hook runs it; When the user runs `--remove-guard` (or `--uninstall`), Then both are gone and other hooks are untouched.
