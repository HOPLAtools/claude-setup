---
name: parallel-dispatch
description: "Parallel agent dispatch for independent tasks. Use when 2+ tasks have no shared state and can run simultaneously, during brainstorming to explore multiple approaches, or when the user says 'in parallel', 'simultaneously', 'at the same time'. Do NOT use when tasks have dependencies or share state."
---

# Parallel Agent Dispatch

## When to Parallelize

**Good candidates:**
- Researching multiple approaches during brainstorming
- Reviewing independent modules simultaneously
- Running tests on separate features
- Investigating different parts of the codebase
- Implementing truly independent vertical slices

**Never parallelize:**
- Tasks that modify the same files
- Tasks with data dependencies (Task B needs Task A's output)
- Tasks that share database state
- Tasks where order matters

## How to Dispatch

### Step 1: Identify Independent Tasks
From the current work, identify tasks that:
- Don't share files
- Don't share state
- Can succeed or fail independently
- Have clear, isolated scope

### Step 2: Create Agent Prompts
For each parallel task, define:
- **Scope**: Exactly what this agent should do (and NOT do)
- **Goal**: Clear success criteria
- **Constraints**: Files it can touch, patterns to follow
- **Expected output**: What to report back

### Step 3: Launch in Parallel
Use the Agent tool with multiple invocations in a single message.

### Step 4: Collect and Merge
- Wait for all agents to complete
- Review each agent's output
- Resolve any unexpected overlaps
- Validate the combined result

## Common Parallel Patterns

### Brainstorming (3 approaches)
```
Agent 1: "Research approach A for [feature]. Pros, cons, effort estimate."
Agent 2: "Research approach B for [feature]. Pros, cons, effort estimate."
Agent 3: "Research approach C for [feature]. Pros, cons, effort estimate."
```

### Code Review (by module)
```
Agent 1: "Review changes in src/auth/ for bugs and security issues"
Agent 2: "Review changes in src/api/ for bugs and performance issues"
Agent 3: "Review changes in src/ui/ for accessibility and UX issues"
```

### Research (multiple areas)
```
Agent 1: "Find all usages of [function] across the codebase"
Agent 2: "Research how [library] handles [pattern] in their docs"
Agent 3: "Check if similar functionality exists in our codebase"
```
