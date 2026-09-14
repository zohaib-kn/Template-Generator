# lib/

This directory will contain **shared utility functions and helpers** used
across the entire application (features, templates, services).

These are generic, domain-agnostic utilities that do not depend on React
or the document generator domain.

## Planned contents (Phase 1+)

- `formatDate.ts` — ISO date string → locale-aware human-readable format
- `generateId.ts` — generates collision-resistant client-side IDs (e.g. for list entries)
- `cn.ts` — class name utility (conditionally joins CSS class strings)
- `invariant.ts` — runtime assertion helper

## Rules

- Functions here must be pure (no side effects, no API calls, no DOM access).
- No imports from `@/features/`, `@/templates/`, `@/components/`, or `@/services/`.
- May import from `@/types` for type annotations only.
- If a function is only used within one feature, keep it in `@/features/.../utils/` instead.
