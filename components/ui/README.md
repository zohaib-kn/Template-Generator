# components/ui/

This directory will contain **generic, reusable UI primitives**.

These components have no knowledge of the document generator domain —
they are the application's internal design-system building blocks.

## Planned contents (Phase 1+)

- `Button` — primary / secondary / ghost button variants
- `Input` — styled text input
- `Textarea` — styled multi-line input
- `Select` — styled dropdown select
- `Label` — form label
- `Card` — container card with optional shadow/border
- `Badge` — status badge
- `Spinner` — loading indicator
- `Tooltip` — hover tooltip wrapper
- `Modal` — dialog / modal overlay

## Rules

- No component here may import from `@/features/`, `@/templates/`, or `@/services/`.
- No component here may perform any data fetching.
- Components must accept standard HTML attributes via spread (`...props`).
- Styling uses Tailwind CSS utility classes (v4 syntax).
- All components must be TypeScript-strict (no implicit `any`).
