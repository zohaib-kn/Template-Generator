# components/common/

This directory will contain **application-level components** that are shared
across multiple features but are aware of the application's domain.

Unlike `../ui/`, components here may import from `@/types` and understand
document/template concepts, but they are still reusable across pages and features.

## Planned contents (Phase 1+)

- `AppHeader` — top navigation bar (product name, save/export actions)
- `AppShell` — page-level layout wrapper
- `ErrorBoundary` — React error boundary for graceful error display
- `EmptyState` — reusable empty-state illustration + message
- `ConfirmDialog` — reusable confirmation modal

## Rules

- Components here may import from `@/types` and `@/components/ui`.
- Components here must NOT import from `@/features/` (that would invert the dependency).
- Components here must NOT import from `@/templates/`.
- No direct API calls — pass data and handlers as props.
