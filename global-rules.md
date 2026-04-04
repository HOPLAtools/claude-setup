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

### Branch Strategy

Detect which model the project uses by checking if a `develop` or `dev` branch exists (`git branch -r`):

**GitHub Flow (main-only — no develop/dev branch):**
- `main` → primary branch, always deployable
- Feature branches: `feature/short-description` → created from `main`, merged back via PR
- Bug fix branches: `fix/short-description` → created from `main`
- Hotfix branches: `hotfix/short-description` → created from `main` (for urgent production fixes)
- All PRs target `main`

**Git Flow (with develop branch):**
- `main` → production releases only, never commit directly
- `develop` / `dev` → active development branch
- Feature branches: `feature/short-description` → created from `develop`, merged back via PR
- Bug fix branches: `fix/short-description` → created from `develop`
- Hotfix branches: `hotfix/short-description` → created from `main`, merged to both `main` and `develop`
- Feature/fix PRs target `develop`; hotfix PRs target `main`

**Auto-detection:** When creating branches or PRs, check which branches exist remotely. If only `origin/main` exists, use GitHub Flow. If `origin/develop` or `origin/dev` exists, use Git Flow.

### Commit Format — Conventional Commits
```
<type>(<optional scope>): <short description>

[optional body]
```

**Types:**
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code restructure without behavior change
- `docs:` — documentation only
- `test:` — adding or fixing tests
- `chore:` — build, config, dependencies
- `style:` — formatting, no logic change

**Examples:**
```
feat(auth): add JWT token validation
fix(api): handle null response from products endpoint
chore: update dependencies to latest versions
```

### When to Suggest a Commit
Explain in plain language when suggesting a commit, adapting to the user's language, e.g.:
> "This would be a good moment to commit — we finished feature X and all tests pass. Should we commit before continuing?"

---

## 5. Code Quality

- Validate before considering anything done (lint → types → tests)
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
<!-- List your configured MCP servers here so the agent knows what tools are available -->
<!-- Example: -->
<!-- - Playwright: Browser automation for E2E testing -->
<!-- - Supabase: Database management -->
<!-- When planning features, explicitly include MCP integration points in the plan -->

---

## 🛠️ Available HOPLA Commands
When a skill applies to your current task, you MUST use it. Check available skills before responding.

### Workflow: Plan → Implement → Validate
1. `/hopla-plan-feature` — Research codebase and create implementation plan
2. `/hopla-review-plan` — Review plan before execution
3. `/hopla-execute` — Execute plan with validation
4. `/hopla-validate` — Run full validation pyramid
5. `git` skill — Say "commit" or "create PR" to trigger automatically

### Other commands
- `/hopla-create-prd` — Create or update Product Requirements Document
- `/hopla-init-project` — Initialize project with CLAUDE.md and .agents/ structure
- `/hopla-code-review-fix` — Fix issues from code review report
- `/hopla-system-review` — Analyze plan vs execution for process improvements
