# Global Rules — Agentic Coding System

> 🌐 **CRITICAL — Language:** Always respond in the same language the user is writing in. Match the user's language — do not default to any specific language. This rule overrides everything else.

## 1. Communication

- **Always respond in the language the user writes in** — match their language, never assume a default
- Code, comments, variable names, and commit messages always in **English** regardless of the conversation language
- Be concise — avoid unnecessary filler text
- When reporting results, use ✅/❌ for clarity

---

## 2. Tech Preferences

- **Frontend:** React with functional components and hooks (no class components)
- **Language:** TypeScript over JavaScript always
- **Bundler:** Vite as default for frontend projects
- Keep solutions simple — avoid over-engineering and premature abstractions
- Prefer editing existing files over creating new ones

---

## 3. Behavior & Autonomy

**Always ask before:**

- Running `git commit`
- Running `git push`
- Installing new dependencies (`npm install <pkg>`, `pip install <pkg>`, etc.)
- Deleting files or directories
- Any destructive or hard-to-reverse operation

**Proactively suggest commits** at logical save points:

- After completing a feature or fix
- Before starting a risky refactor
- After passing all validation checks
- Explain WHY it's a good moment to commit so the team understands

**Never:**

- Auto-commit or auto-push without explicit approval
- Skip validation steps to save time
- Add features, refactors, or improvements beyond what was asked

---

## 4. Git Workflow

Follow **Conventional Commits** (`type(scope): description`). Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`.

Branch strategy (GitHub Flow vs Git Flow) is **auto-detected** by the git skill based on whether `origin/develop` or `origin/dev` exists. See the git skill for full details.

When suggesting a commit, explain in plain language why it's a good moment, adapting to the user's language.

---

## 5. Code Quality

- Validate before declaring done (lint → types → tests). The verify skill enforces this at completion.
- Write tests alongside implementation, not after
- Flag security issues immediately — never leave them for later
- If the same validation failure repeats, signal it as a system improvement opportunity

---

## 📋 Context Management

### Three levels of CLAUDE.md

- **Machine-level** (`~/.claude/CLAUDE.md`): These global rules — apply to all projects
- **Project-level** (`CLAUDE.md` at repo root): Shared with team via git — project-specific rules
- **Local-level** (`CLAUDE.local.md`): Personal overrides — NOT committed to git

### Context control

- Use `@filename` to include specific files in context (works in chat and inside CLAUDE.md)
- Use `/compact` between related tasks (preserves learned knowledge)
- Use `/clear` between unrelated tasks (full reset)
- Use `#` memory mode to quickly add rules: `# Never use console.log for debugging`
- Use `Escape` to interrupt + `#` to prevent repeated errors
- Use `Shift+Tab` twice to activate Plan Mode for complex multi-file changes

---

## 🔌 MCP Servers

Declare MCP servers in your project's `.mcp.json` so Claude Code picks them up automatically. Copy the starter template from the plugin:

```bash
# Inside your project root
cp ~/.claude/plugins/marketplaces/hopla-marketplace/.claude-plugin/.mcp.json.example .mcp.json
# Then edit — uncomment the servers you need, set env vars in your shell
```

List the servers you actually enabled here so the agent knows what tools are available, e.g.:
- Playwright — browser automation for E2E testing and UI inspection
- GitHub — PR/issue access (read and write depending on token scope)
- Linear — workspace tickets, cycles, projects

When planning features, explicitly include MCP integration points in the plan.

---

## 🛠️ HOPLA Skills

HOPLA skills are auto-triggered based on context — no slash command needed. The session-prime hook lists available skills at the start of each session.

When a skill applies to your current task, you MUST use it. Check available skills before responding.

Use the `plan-feature` command to start the full Plan → Implement → Validate workflow.
