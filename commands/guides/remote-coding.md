# Remote Agentic Coding Guide (Future)

## When to Use This Guide
Reference this guide when setting up GitHub-based automation for remote code generation.

## Overview

Remote agentic coding moves AI-assisted development from your local terminal to GitHub, enabling:
- Issue-driven development (create issue → agent implements → PR created)
- Automated code review on PRs
- Release note generation from commit history
- Parallel feature development across multiple agents

## Three Autonomy Levels

### Level 1: Hybrid (Recommended Starting Point)
- **Agent**: Creates branch, implements, comments on issue
- **Human**: Reviews PR, makes final decision to merge
- **Setup**: GitHub Actions + Claude Code CLI

### Level 2: Autonomous
- **Agent**: Everything including PR creation and merge
- **Human**: Only monitors
- **Setup**: GitHub Actions + full permissions

### Level 3: Deterministic
- **Workflow**: Controls process (branch creation, PR management)
- **Agent**: Only responsible for code changes
- **Setup**: Strict GitHub Actions workflow

## GitHub Actions Workflow (Level 1)

```yaml
name: Claude Code Agent
on:
  issues:
    types: [assigned]
  issue_comment:
    types: [created]

jobs:
  agent:
    if: contains(github.event.comment.body, '@claude')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Claude Code
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npx claude-code --print "
            Read issue #${{ github.event.issue.number }}.
            /hopla-plan-feature based on the issue requirements.
            /hopla-execute the plan.
            /hopla-validate
            Create a PR with the results.
          "
```

## Prerequisites
- HOPLA commands installed in the repo (.claude/commands/)
- CLAUDE.md configured for the project
- GitHub Actions enabled
- Claude Code API key in GitHub Secrets

## Best Practices
- Start with Level 1 (hybrid) until you trust the system
- Always require human PR review
- Use conventional commits for automated changelog generation
- Set up branch protection rules to prevent direct merges
