# Hook Audit Checklist

Four mechanical rules. Each rule has a portable detection command (BSD + GNU grep), a fix suggestion, and a canonical reference from consumer-project history.

> **Maintainer note on canonical references:** The cited commit hashes and file names come from a specific consumer project (PhoneTest-Desktop-App). When this skill is used in other consumer projects, the references may not resolve locally — that's fine, they are documentation of the pattern's origin, not a hard dependency. Update them as patterns evolve (revisit when promoting to v2).

---

## Rule P-5 — Hook return must be memoized

**Severity:** high

**What it catches:** A hook function that ends with `return { ... };` (object literal) NOT wrapped in `useMemo`. Every render returns a new object, which invalidates downstream `useMemo` / `useEffect` deps that consume the hook's return, causing re-render storms and stale-closure bugs.

**Scope filter (apply BEFORE flagging):** The rule applies only to the FINAL return statement of a function whose name starts with `use` and that calls React hooks (`useState`, `useRef`, `useMemo`, `useEffect`, etc.). Plain helper functions inside the same file (e.g. `async function fakeFetch(...)`) are NOT subject to this rule even if they return an object literal.

**Detection (portable grep):**

```bash
# Step 1 — collect candidate `return { ... }` lines (heuristic; may include helpers)
grep -nE 'return[[:space:]]*\{' "$FILE"
```

For each match, read the surrounding 20 lines and apply two filters:
1. Is the enclosing function a React hook (named `useX`, uses React hooks)? If no → skip.
2. Is the `return { ... }` block already inside a `useMemo(() => ({ ... }), [...])` wrapper? If yes → skip.

Only flag matches that fail BOTH filters. The wrapper pattern looks like:

```ts
return useMemo(() => ({
  field1,
  field2,
}), [field1, field2]);
```

If the `return { ... }` is NOT inside a `useMemo`, flag it.

**Fix:**

```ts
// Before
return {
  foo,
  bar,
  doSomething,
};

// After
return useMemo(() => ({
  foo,
  bar,
  doSomething,
}), [foo, bar, doSomething]);
```

Include every field used in the object literal in the dep array. Missing deps cause stale values.

**Canonical reference:** `useGradingDefinitions.ts:123-127` (consumer projects). Look for the well-formed `return useMemo(() => ({ ... }), [...])` shape there as the model.

---

## Rule S-8 — `setLoading(false)` must not be gated by stale-id guard

**Severity:** high

**What it catches:** Inside a `finally` block, `setLoading(false)` is wrapped in an `if (currentXRef.current === X)` guard. The guard correctly prevents stale results from overwriting newer ones, but ALSO blocks `setLoading(false)` from running when the request is superseded — leaving the UI stuck in "loading" forever when the user rapidly switches inputs.

**Detection (portable grep):**

```bash
# Find any line with `setLoading(false)` inside the file, then read 5 lines above to check for an `if (current*Ref.current === ...)` guard
grep -nE 'setLoading\(false\)' "$FILE"
```

For each match, read 5–10 lines above and confirm whether the call is enclosed by:

```ts
if (currentSomethingRef.current === somethingId) {
  // ... result handling ...
  setLoading(false);  // BUG: blocked when request is superseded
}
```

If the `setLoading(false)` is INSIDE the guard, flag it. If it's OUTSIDE the guard (i.e. after the closing brace), the file is clean for this rule.

**Fix:**

```ts
// Before — bug: setLoading blocked when superseded
} finally {
  if (currentImeiRef.current === imei) {
    setData(result);
    setLoading(false);
  }
}

// After — setLoading runs unconditionally; only data update is guarded
} finally {
  if (currentImeiRef.current === imei) {
    setData(result);
  }
  setLoading(false);
}
```

**Canonical reference:** `useSickwLookup.ts` after commit `228cd6a` (PhoneTest history). The fix moved `setLoading(false)` out of the guard.

---

## Rule E-1 — Error matching must be anchored, not substring

**Severity:** medium

**What it catches:** Error message detection that uses `.includes('imei')` or similar substring patterns. A substring match can fire on unrelated error messages that happen to contain the token (e.g. `"server error: imei lookup deferred"` would match an `imei`-specific error handler intended only for `"invalid imei format"`).

**Detection (portable grep):**

```bash
grep -nE "\.message\??\.includes\([\"'][a-z]+[\"']\)" "$FILE"
```

This regex matches the antipattern `error.message.includes('foo')` (optional chaining tolerated). Each hit is a finding.

**Fix:**

```ts
// Before — substring match (too permissive)
if (error.message.includes('imei')) {
  // ...
}

// After — anchored regex (precise)
if (/^(invalid )?imei( format)?\b/i.test(error.message)) {
  // ...
}

// Alternative — exact match if the message is a known constant
if (error.message === 'Invalid IMEI') {
  // ...
}
```

**Canonical reference:** Consumer-project review checklist Section 1, pattern documented after the `useImeiInOtherShipment.ts` error-overshadow incident.

---

## Rule D-1 — Module-level cache must have in-flight dedup

**Severity:** medium

**What it catches:** A hook file declares a module-level `cache` Map for response caching but does NOT also declare an `inFlight` Map. Without dedup, two parallel calls for the same key race and produce duplicate network requests.

**Detection (portable grep):**

```bash
# Find module-level `const cache = new Map`
grep -nE '^const cache[[:space:]]*=[[:space:]]*new Map' "$FILE"
```

If the file matches, check for the companion `inFlight` map:

```bash
grep -nE '^const inFlight[[:space:]]*=[[:space:]]*new Map' "$FILE"
```

If `cache` is present but `inFlight` is absent, flag it. Both declarations must be at module scope (no leading whitespace).

**Fix:**

```ts
// Both maps at module scope
const cache = new Map<string, ResultShape>();
const inFlight = new Map<string, Promise<ResultShape>>();

async function fetchOnce(key: string): Promise<ResultShape> {
  const cached = cache.get(key);
  if (cached) return cached;

  const inflight = inFlight.get(key);
  if (inflight) return inflight;

  const promise = doFetch(key).then((result) => {
    cache.set(key, result);
    inFlight.delete(key);
    return result;
  });
  inFlight.set(key, promise);
  return promise;
}
```

The companion `inFlight` map ensures parallel calls for the same key share a single in-flight Promise instead of racing.

**Canonical reference:** Consumer-project lookup hooks pattern (e.g. `useSickwLookup.ts` post-`228cd6a`).

---

## Portability Notes

All detection commands use BRE/ERE syntax supported by both:
- BSD grep (macOS default — `/usr/bin/grep`)
- GNU grep (most Linux distributions)

Avoid:
- `-P` (Perl-compatible — GNU only)
- `-z` (null-separated — GNU only)
- Lookahead/lookbehind (`(?=...)`, `(?<=...)`)

Use `grep -nE` for line numbers + ERE. Use `grep -E` instead of `egrep` (the latter is deprecated on some systems).
