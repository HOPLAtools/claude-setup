# Prompt routing

> Current behavior of the system. Started from `hopla-2-2` (archived 2026-10-02).

## Requirements

### REQ-ROUTING-001: Prompt routing hints
- The UserPromptSubmit hook no longer injects skill hints; skill selection relies on native `description` / `when_to_use` matching.
