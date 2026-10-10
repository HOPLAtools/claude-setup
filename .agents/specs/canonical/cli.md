# CLI

> Current behavior of the system. From `hopla-3-4-0`, updated by `hopla-4-1-1` (archived 2026-10-10).

## Requirements

### REQ-CLI-001: Optional cost settings
- Scenario: fresh settings — Given a settings.json without the keys, When the user runs `hopla-claude-setup --setup-settings`, Then `workflowKeywordTriggerEnabled` is false and `env.CLAUDE_CODE_SUBAGENT_MODEL` is "sonnet"; Given they are already set, Then nothing changes and the keys are reported.

### REQ-CLI-002: Opt-in high-risk guard
- Scenario: install and remove — Given no guard, When the user runs `--setup-guard`, Then `~/.claude/hooks/high-risk-guard.js` exists and a PreToolUse Bash hook runs it; When the user runs `--remove-guard` (or `--uninstall`), Then both are gone and other hooks are untouched.

### REQ-CLI-003: The CLI runs from the npm global bin
- Scenario: symlinked bin — Given the package is installed globally, When the user runs `hopla-claude-setup --setup-guard`, Then the command runs (output and effects), not a silent no-op.
