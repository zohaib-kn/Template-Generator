# CRM authentication contract

The Template Generator does not have its own user accounts. Operators sign in through the CRM, and the CRM tells this app who they are and which students they may work on.

This document describes what the CRM team needs to provide. Until `CRM_AUTH_VERIFY_URL` is configured, every protected page and API returns "sign-in required" (fail closed).

## 1. Launching the app from the CRM

The CRM opens the app with a short-lived, single-operator token:

```
GET https://<template-generator>/api/auth/launch?token=<crm-token>&next=/sop-generator?student=<studentId>
```

- `token`: opaque string issued by the CRM. It should be short-lived (we recommend 5 minutes or less) and ideally single-use.
- `next` (optional): a same-origin path to open after sign-in. Absolute URLs and `//host` are ignored.

The app verifies the token server-side, sets an HttpOnly `tg_session` cookie and redirects to `next`. The token never reaches browser JavaScript.

Server-to-server callers can instead send `Authorization: Bearer <crm-token>` on any API request. Each call without a session cookie is verified against the CRM, with a 60-second cache. They can also exchange a token for a cookie with `POST /api/auth/session`.

## 2. Verify endpoint (implemented by the CRM)

```
POST <CRM_AUTH_VERIFY_URL>
Authorization: Bearer <crm-token>
X-API-Key: <CRM_AUTH_SERVICE_KEY>     (sent only if configured)
Accept: application/json
```

### Success: HTTP 200

```json
{
  "valid": true,
  "user": { "id": "crm-user-id", "name": "Counsellor Name" },
  "allowedStudentIds": ["65a000000000000000000001", "65a000000000000000000002"],
  "expiresAt": "2026-10-29T18:00:00Z"
}
```

| Field | Required | Meaning |
|---|---|---|
| `valid` | yes | Must be `true`. |
| `user.id` | yes | Stable CRM operator ID. |
| `user.name` | no | Display name. |
| `allowedStudentIds` | yes | The CRM student `_id`s this operator may access, or the string `"*"` for all students (e.g. admins). An empty array means no student access. |
| `expiresAt` | no | ISO time when the session must end. The app caps sessions at 8 hours regardless. |

### Failure

Any non-200 status, a timeout (5 s), a redirect, invalid JSON or `valid !== true` is treated as **not authenticated**.

## 3. What the app enforces

- Every page and API route needs a valid session, except:
  - `/auth/*` and `/api/auth/*` (the sign-in flow)
  - `/api/documents/*` when called with the existing `X-API-Key` webhook credential
- These routes also check the session inside the handler:
  - `/api/student/[id]`, `/api/students/list`, `/api/sop/generate`
  - `/api/export/docx`, `/api/export/pdf`
  - `/api/templates`, `/api/proxy-image`
- Student-level checks:
  - `/api/student/[id]` returns 403 for students outside `allowedStudentIds`.
  - `/api/students/list` only lists allowed students.
  - `/api/sop/generate` and the export routes return 403 when the request names a student the operator may not access.
- Fictional sample students (`sample-*` IDs) are available to any signed-in operator.

## 4. Environment variables

| Variable | Purpose |
|---|---|
| `CRM_AUTH_VERIFY_URL` | The verify endpoint above. |
| `CRM_AUTH_SERVICE_KEY` | Optional credential sent to the CRM as `X-API-Key`. |
| `SESSION_SECRET` | 32+ random characters used to sign session cookies. Rotating it signs everyone out. |
| `AUTH_DEV_BYPASS` | `true` skips sign-in for local development. **Ignored when `NODE_ENV=production`.** |
