# features/document-generator/types/

This directory will contain **feature-local TypeScript types** that are specific to
the document generator UI and do not belong in the shared `@/types` package.

Examples of what belongs here:

- Form state shapes that include extra UI-only fields (e.g. `isOpen`, `isDirty`)
- Local view-model types that aggregate shared domain types for convenience
- Component prop types that are non-trivial enough to warrant their own file

## Rules

- Shared domain types (`DocumentData`, `TemplateDefinition`, etc.) must NOT be
  duplicated here — import them from `@/types`.
- Types here must NOT be imported by `@/types` — that would create a circular dependency.
- If a type in this directory proves useful across multiple features, migrate it to `@/types`.
