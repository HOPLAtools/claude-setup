# Global Rules — Agentic Coding System

## 1. Communication

- **Always respond in the same language the user writes in** — if the user writes in Spanish, respond in Spanish; if in English, respond in English
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

## 4. Git Workflow (Git Flow)

### Branch Strategy
- `main` → production only, never commit directly
- `develop` / `dev` → active development branch
- Feature branches: `feature/short-description`
- Bug fix branches: `fix/short-description`
- Hotfix branches: `hotfix/short-description`

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
