# AI-Optimized Codebase Guide

## When to Use This Guide
Reference this guide when initializing a project with `/hopla-init-project` or when optimizing an existing codebase for better AI-assisted development.

## Principles

### 1. Vertical Slice Architecture
Organize code by feature, not by layer:
```
src/
├── core/           # Universal infrastructure (config, database, logging)
├── shared/         # Code used by 3+ features (the "three-feature rule")
└── features/       # Independent vertical slices
    ├── auth/       # routes + service + models + tests
    ├── products/   # routes + service + models + tests
    └── orders/     # routes + service + models + tests
```

**Why**: AI can load an entire feature in one context window. Layer-based organization scatters context across many files.

### 2. LLM-Friendly Docstrings
Write docstrings that help AI understand code:
```typescript
/**
 * PURPOSE: Calculate total order cost including tax and discounts
 * INPUTS: items (OrderItem[]), taxRate (number), discount? (Discount)
 * OUTPUTS: { subtotal, tax, discount, total } (all in cents)
 * GOTCHA: All monetary values are in cents to avoid floating point issues
 * EXAMPLE: calculateTotal([{price: 1000, qty: 2}], 0.08) → {subtotal: 2000, tax: 160, total: 2160}
 */
```

### 3. Structured Logging
Use JSON-structured logs with context for AI parsing:
```typescript
logger.info("order_created", {
  correlation_id: req.id,
  order_id: order.id,
  items_count: items.length,
  total_cents: total,
  duration_ms: Date.now() - start
});
```

**Never**: Log sensitive data, use string formatting, spam in loops

### 4. Strict Type Safety
- Enable strict TypeScript (`strict: true` in tsconfig)
- For Python: use mypy (strict) + pyright
- Types serve as contracts that AI can read and follow

### 5. Comprehensive Validation Commands
Include in CLAUDE.md:
```markdown
## Development Commands
- `npm run lint` — ESLint check
- `npm run typecheck` — TypeScript strict check
- `npm run test` — Unit tests
- `npm run test:integration` — Integration tests
- `npm run dev` — Development server
```

### 6. Test Structure Mirrors Source
```
src/features/auth/auth.service.ts
src/features/auth/__tests__/auth.service.test.ts
```

AI can find tests by convention, no configuration needed.
