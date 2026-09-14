# features/document-generator/components/

This directory will contain **React components** that are specific to the Document Generator feature.

Components here are **not** globally reusable — they render UI that is meaningful only within the context of the document generator workflow.

## Planned contents (Phase 1+)

- `DocumentGeneratorShell` — outer layout wrapper (editor + preview panes)
- `SectionList` — left-panel list of section editors
- `TemplateSelector` — template selection UI

## Rules

- Components here may import from `@/types`, `@/components/ui`, and `@/components/common`.
- Components here must **not** call the database directly.
- Data fetching should be handled via hooks in `../hooks/` which call `@/services/api/`.
- Business logic must not live inside JSX — extract to `../utils/` or `../hooks/`.
