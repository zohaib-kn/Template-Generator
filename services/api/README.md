# services/api/

This directory will contain the **frontend API service layer**.

All communication between the frontend and the backend passes through this directory.
No component, hook, or feature module should call `fetch()` or any HTTP client directly —
all network calls are delegated to service modules here.

## Planned contents (Phase 4 — Frontend ↔ Backend Integration)

- `documentService.ts` — CRUD operations for documents (create, read, update, archive)
- `templateService.ts` — fetch available templates and their metadata
- `assetService.ts` — upload profile photos and other assets
- `pdfService.ts` — trigger PDF generation and download

## Conventions

Each service module will:
1. Accept typed arguments matching `@/types` interfaces.
2. Call the backend REST/API-Route endpoint.
3. Return typed response data.
4. Throw typed errors that the calling hook can handle.

## Backend boundary

The backend will be implemented in a separate phase (Phase 2). When it exists,
it will be reachable via Next.js API Routes at `/api/...`.

The frontend must never bypass the backend to reach the database directly.

## Environment

Base URL and environment variables (e.g. `NEXT_PUBLIC_API_URL`) will be
configured here once the backend is defined.
