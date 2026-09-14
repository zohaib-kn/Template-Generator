# features/document-generator/validation/

This directory will contain **frontend validation logic** for document section forms.

Validation here is for immediate user feedback (required fields, format checks).
It is **not** a replacement for backend validation — the backend must always
re-validate before persisting.

## Planned contents (Phase 1+)

- `personalDetailsSchema.ts` — validation rules for the personal details block
- `educationSchema.ts` — validation rules for an education entry
- `commonRules.ts` — shared rules (e.g. email format, date format)

## Technology note

A validation library (e.g. Zod, Yup) has NOT been selected yet.
The decision will be made in Phase 1. This directory is reserved so forms
can reference `../validation/` as a stable import path once it is implemented.

## Rules

- Validation schemas here must import their field shapes from `@/types`.
- Validation output must be UI-agnostic (return error messages as strings).
- Never call the API from a validation function.
