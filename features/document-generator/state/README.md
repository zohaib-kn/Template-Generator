# features/document-generator/state/

This directory will contain **client-side state** logic for the document generator.

If a lightweight state management approach is adopted (e.g. React Context + useReducer,
or Zustand), the store definition and actions live here.

No state management library has been selected yet. The decision will be made during
Phase 1 (Frontend Foundation) based on the actual complexity of state required.

## Possible contents (Phase 1+)

- `documentStore.ts` — store definition (slices, actions, selectors)
- `DocumentProvider.tsx` — React context provider (if using Context API)

## Rules

- State here represents **UI-layer state** only — what the user is editing right now.
- Persisted state lives in the backend database, reached via `@/services/api/`.
- Do not store sensitive data in client-side state.
- Keep the state shape as close to `DocumentData` as possible to simplify serialisation.
