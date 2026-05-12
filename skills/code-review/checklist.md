# Code Review Checklist

Apply every category to every changed file. Severity guidance is in the parent `SKILL.md`.

## 1. Logic Errors

- Off-by-one errors, incorrect conditionals
- Missing error handling, unhandled edge cases
- Race conditions or async issues
- Stale closures — callbacks passed to imperative APIs (grids, charts, maps) that capture stale state instead of using refs or stable references
- Unhandled promise rejections — `.then()` without `.catch()`, async calls without `try/catch` in non-void contexts
- Side effects inside JSX render — mutations of arrays/objects inside `.map()` in JSX (breaks React strict mode, causes double-execution bugs)
- Stale dependency arrays — for every new `useState`/`useRef` variable introduced in the diff, verify it appears in the dependency arrays of `useEffect`, `useCallback`, or `useMemo` that reference it. Missing deps cause stale closures and are a recurring source of React bugs.

## 2. Security Issues

- Exposed secrets or API keys
- SQL/command injection vulnerabilities
- Missing input validation on API endpoints — required fields, format constraints (regex, length), payload size limits
- Insecure data handling — raw user input in queries, responses exposing internal data or stack traces
- XSS vulnerabilities (frontend)
- Multi-user authorization context — for multi-tenant apps, verify each endpoint filters by the correct context (e.g., active org vs personal org, admin vs viewer). Check that middleware/auth guards match the intended audience for each route.

## 3. Performance Problems

- Unnecessary re-renders (React)
- N+1 queries — database queries or API calls inside loops (`for`, `.map`, `.forEach`), duplicate existence checks before mutations, sequential operations that could use `Promise.all()` or batch SQL
- Memory leaks (event listeners not detached, timers not cleared, closures holding large objects)

## 4. Code Quality

- DRY violations — before flagging, search for similar functions/constants elsewhere in the codebase; suggest extraction to a shared module if the same logic exists in multiple places
- Poor naming or overly complex functions
- Missing TypeScript types or `any` usage

## 5. Pattern Adherence

- Follows project conventions from `AGENTS.md` (or `CLAUDE.md` as fallback)
- Consistent with existing codebase style

## 6. Route & Middleware Ordering

- Static routes defined AFTER parameterized routes (e.g., `/users/all` after `/users/:id`) causing shadowing — the parameterized route captures requests meant for the static one
- Middleware applied in incorrect order (e.g., auth after route handler, CORS after response sent)
