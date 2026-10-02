# Dotenv protection

> Current behavior of the system. Started from `hopla-2-2` (archived 2026-10-02).

## Requirements

### REQ-ENVPROTECT-001: Dotenv protection blocks reads, not mentions
- Scenario: mention only — Given `git commit -m "docs: mention .env handling"`, When the PreToolUse hook runs, Then the command is allowed.
- Scenario: real read — Given `grep SECRET .env`, When the hook runs, Then it is blocked with exit 2.
- Scenario: template — Given `Read .env.example`, When the hook runs, Then it is allowed.

### REQ-ENVPROTECT-002: `.dev.vars` protected from Read, Grep and Edit
- Scenario: file tool — Given `Read /p/.dev.vars`, When the hook runs, Then it is blocked.
- Scenario: Bash and Write — Given `sed -n p .dev.vars` or `Write /p/.dev.vars`, When the hook runs, Then it is allowed.
