---
name: subagent-execution
description: "Subagent-driven execution for large plans. Use when executing plans with 5+ tasks to maintain context quality, when the user says 'use subagents', 'parallel execution', or when context degradation is a concern in long implementations. Do NOT use for small plans (< 5 tasks) or quick fixes."
---

# Subagent-Driven Execution

## When to Use
- Plans with 5+ implementation tasks
- Complex features spanning multiple files/modules
- When context quality matters more than speed

## How It Works

Instead of executing all tasks in one conversation (where context degrades), dispatch a fresh agent per task.

### Per-Task Flow

1. **Dispatch implementer agent** with:
   - The specific task spec (not the full plan)
   - Relevant file paths from the plan
   - Project AGENTS.md (or CLAUDE.md as fallback) for conventions
   - Clear success criteria

2. **Agent implements, tests, and reports** with status:
   - `DONE` — Task complete, tests pass
   - `DONE_WITH_CONCERNS` — Complete but flagged issues
   - `NEEDS_CONTEXT` — Missing information, needs clarification
   - `BLOCKED` — Cannot proceed, needs human input

3. **Review the result**:
   - Read the agent's output/report
   - Verify files were created/modified correctly
   - Run validation on the changes

4. **If DONE**: Mark task complete, move to next
5. **If issues**: Address them before moving on

### Dispatch Template

When launching a subagent for a task:
```
Implement this task from the plan:

**Task**: [task description]
**Files**: [files to create/modify]
**Pattern**: [reference pattern from codebase]
**Tests**: [tests to write]
**Validation**: [command to verify]

Project conventions are in AGENTS.md (or CLAUDE.md for legacy projects). Follow them strictly.
Report your status as DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED.
```

### Model Selection
- Use the least powerful model that can handle the task
- Simple file creation: `haiku`
- Standard implementation: `sonnet`
- Complex logic/architecture: `opus`

### Commit Strategy
- Don't commit after every task (too noisy)
- Commit at phase boundaries (every 3-5 tasks)
- Always validate before committing

## Integration with /hopla:execute
This skill is an ALTERNATIVE to inline execution. Suggest it when:
- The plan has 5+ tasks
- The user expresses concern about quality in long sessions
- Previous executions showed context degradation issues
