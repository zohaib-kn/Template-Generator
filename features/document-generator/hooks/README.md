# features/document-generator/hooks/

This directory will contain **custom React hooks** for the document generator feature.

Hooks here encapsulate state management, side effects, and API communication,
keeping these concerns out of component JSX.

## Planned contents (Phase 1+)

- `useDocumentState` — manages the in-memory `DocumentData` being edited
- `useTemplateSelection` — tracks the currently selected template / version
- `useSaveDocument` — handles saving (draft persistence, optimistic updates)
- `useExportPdf` — triggers PDF generation via the backend API

## Rules

- Hooks must not import from other hooks in this directory in a circular way.
- API calls must go through `@/services/api/`, not be written inline in hooks.
- Hooks may import from `@/types` and `@/lib`.
