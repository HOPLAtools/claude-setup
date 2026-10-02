#!/usr/bin/env node
// UserPromptSubmit hook — intentionally silent since 2.2.0.
// Skill selection now relies on the native `description` / `when_to_use`
// frontmatter. The hook stays registered in hooks.json so it can become the
// deprecation notifier in 3.0 without a hooks.json change.

// Drain stdin so Claude Code never sees EPIPE, then exit without output.
for await (const _chunk of process.stdin) { /* discard */ }
process.exit(0);
