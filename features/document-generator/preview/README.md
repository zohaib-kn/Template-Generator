# features/document-generator/preview/

This directory will contain the **live A4 preview** components.

The preview renders a scaled-down, pixel-accurate A4 representation of the document
using the selected template component. It updates reactively as the user edits form fields.

## Planned contents (Phase 1+)

- `DocumentPreview` — top-level preview shell (handles A4 scaling, scroll)
- `PreviewPage` — renders a single A4 page within the preview
- `PreviewScaler` — CSS transform-based scaling logic

## Rules

- The preview must use the same template components as the final PDF renderer.
  Do not create a separate "simplified" preview that diverges from the real output.
- The preview must not call any API — it receives `DocumentData` and `TemplateDefinition` as props.
- PDF-specific media queries and print styles live in `@/templates/`, not here.
