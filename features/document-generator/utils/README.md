# features/document-generator/utils/

This directory will contain **pure utility functions** used within the document generator feature.

Utilities here are deterministic, side-effect-free helpers.
They must not import React, call APIs, or access the DOM.

## Planned contents (Phase 1+)

- `generateId.ts` — generates stable client-side IDs for repeatable list entries
- `documentDefaults.ts` — returns an empty `DocumentData` object with default values
- `sectionHelpers.ts` — helpers for section ordering, conditional display, etc.

## Rules

- Functions here must be pure (same input → same output, no side effects).
- If a utility is useful across multiple features, move it to `@/lib/`.
- Do not import feature-specific components or hooks from here.
