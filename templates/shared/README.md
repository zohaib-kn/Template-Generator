# templates/shared/

This directory will contain **shared React components** used by multiple template layouts.

These components encapsulate common document-rendering patterns (e.g. section headings,
dividers, label/value pairs) so individual templates can compose them rather than
duplicating markup.

## Planned contents (Phase 1+)

- `SectionTitle` — styled section heading (used by all templates)
- `LabelValue` — renders a labelled field (e.g. "Nationality: British")
- `Divider` — horizontal separator between sections
- `PageBreak` — signals a page boundary for the PDF renderer

## Rules

- Components here must be **purely presentational** — no data fetching, no state.
- They receive only the props needed for rendering.
- They must not import from any specific template directory (`../europass/`, etc.).
- All styling must be compatible with both screen preview and PDF rendering.
