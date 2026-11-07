# Developer API Access and Export Security

**Date:** 2026-11-07  
**Status:** Approved for planning  
**Phase:** 1 (partner-ready + stop open downloads). Phase 2 retires the public DBI key.

## Problem

External partners (e.g. Sanjib Sikder for Upanishad analyses under CC BY-NC-SA) need controlled, read-only access to selected books. Today:

- There is no Developer role and no personal API keys.
- Clerk middleware treats all `/api/` paths as public.
- Many routes only check `DB-Access-Key` against `NEXT_PUBLIC_DBI_KEY`, which is shipped to every browser.
- `/api/download`, `/api/download/stream`, and `/api/download/size` have no authentication.

## Goals (Phase 1)

1. Add a **Developer** role, grantable only by Root or Admin.
2. Provide a login-only **API Access** page for Developers to generate a key and request books.
3. Add an **Admin tab** to approve/reject book requests, revoke keys/grants, and track history.
4. Lock export/download routes so they require either a Clerk session (existing Admin download UI) or a scoped Developer key.
5. Log Developer export calls to **Axiom** (free searchable logs). Keep request/grant state in MongoDB.
6. Do **not** rewrite analysis or shloka content. Tests use fixtures or a duplicate database only.

## Non-goals (Phase 1)

- Removing `NEXT_PUBLIC_DBI_KEY` from the client.
- Replacing every `verifyDBAccess` call with Clerk.
- Write access for Developer keys.
- `book=all` dumps for Developer keys.
- GitHub static dumps as the partner delivery path.

## Decisions (locked)

| Topic | Choice |
|---|---|
| Key power | Read-only export of **approved books only** |
| Who grants Developer | Root and Admin |
| Flow | Generate key first → request books → Admin/Root approve → key works for those books |
| Public DBI key | Keep for website UI until Phase 2 |
| Phase 1 hardness | Partner flow + authenticate export routes |
| Access logs | Axiom (not forever in Mongo) |
| Live data | No content mutations; test on duplicate/fixtures |

## Architecture

```
Developer (Clerk login)
  → /api-access
      → generate/revoke personal key (hash stored)
      → request books (pending)
Admin/Root
  → /admin?tab=api-access
      → approve/reject → grants
Partner script
  → Authorization: Bearer <key>
  → /api/download* for granted books only
  → Axiom event per call
Website UI (unchanged Phase 1)
  → still uses NEXT_PUBLIC_DBI_KEY for existing helpers
```

## Roles

Existing: `User`, `Annotator`, `Editor`, `Admin`, `Root`.  
New: `Developer`.

- Root/Admin assign or remove `Developer` in the existing permissions UI.
- Developer does not get Admin powers and cannot call write APIs with their personal key.
- Root/Admin may open `/api-access` for support.

## Data model

### `apiKeys`

| Field | Notes |
|---|---|
| `userId` | Clerk user id |
| `keyPrefix` | First characters for display/audit |
| `keyHash` | SHA-256 (or stronger) of secret; never store raw key |
| `status` | `active` \| `revoked` |
| `createdAt`, `revokedAt`, `lastUsedAt` | |

Phase 1: one active key per Developer. Regenerating replaces and revokes the previous key. Raw secret shown once at creation.

### `apiAccessRequests`

| Field | Notes |
|---|---|
| `userId`, `userName` | Requester |
| `books` | Array of book titles as stored in DB |
| `note` | Optional requester note |
| `status` | `pending` \| `approved` \| `rejected` |
| `reviewedBy`, `reviewedAt`, `reviewNote` | Admin action |
| `createdAt` | |

### `apiBookGrants` (or grants embedded on key)

| Field | Notes |
|---|---|
| `userId` | |
| `book` | Exact book title |
| `requestId` | Source request |
| `grantedBy`, `grantedAt` | |
| `revokedAt` | Optional |

Book access exists only through an approved request (or explicit Admin revoke).

## API Access page (`/api-access`)

- Requires login + `Developer` (or Root/Admin).
- Nav link only for those roles.
- Features: key status, generate/regenerate (one-time reveal), request books (multi-select published books + note), list of requests and current grants, short usage docs (header, example curl, CC BY-NC-SA reminder).

### Partner auth headers

- Preferred: `Authorization: Bearer <key>`
- Also: `X-API-Key: <key>`
- Do **not** reuse `DB-Access-Key` for personal keys.

## Admin tab (`/admin?tab=api-access`)

- Admin/Root only.
- Pending requests first; history with filters (status, user).
- Actions: Approve, Reject (optional note), Revoke grant, Revoke key.
- Columns: requester, books, note, dates, key status, last used.

## Export route auth (Phase 1)

Routes:

- `GET /api/download`
- `GET /api/download/stream`
- `GET /api/download/size`

Allowed if:

1. Clerk session and user is Admin/Root (existing in-app download), **or**
2. Valid active Developer key whose grants include the requested `book`.

Denied:

- Missing/invalid credentials → `401`
- Valid Developer key but book not granted, or `book=all` → `403`
- Public `DB-Access-Key` alone is **not** enough for these export routes after Phase 1

Read-only: no POST/PUT/DELETE via Developer keys in Phase 1.

## Axiom logging

- Env (server-only): `AXIOM_TOKEN`, `AXIOM_DATASET` (e.g. `start-api-access`).
- On each Developer-key export call, ingest one event: `userId`, `keyPrefix`, `book`, `route`, `status`, `ip`, `userAgent`, `durationMs`, `timestamp`.
- Mongo remains source of truth for keys, requests, grants.
- Setup after implementation starts: create free Axiom account → dataset → API token → set env on Vercel and local `.env.local`.

## Security audit

### Critical — Phase 1

1. Unauthenticated download/stream/size → authenticate as above.
2. No per-partner scoped access → Developer + grants + approval.

### High — Phase 2

3. `NEXT_PUBLIC_DBI_KEY` is a public shared password for many mutating routes (`verifyDBAccess`).
4. Clerk middleware leaves all `/api/` public at the edge.
5. Destructive routes (e.g. delete all analysis for a book) gated only by that public key.

### Medium — later

6. Broad CORS (`*`) on some book routes.
7. No rate limiting on exports (Axiom helps observe; soft limits later).
8. Ensure keys are hashed; never log raw secrets to Axiom or Mongo.

### Explicitly unchanged in Phase 1

- Analysis/shloka document contents.
- Website helpers still sending `NEXT_PUBLIC_DBI_KEY` for non-export routes.

## Testing and live-data rules

- No scripts that update production analysis rows for this feature.
- Unit/integration tests use fixtures or a **duplicate** Mongo database.
- Manual verification of export auth against a copied book set or non-production DB when possible.
- Production smoke: assign Developer on a test account, grant one non-critical book, curl with key, confirm Axiom event; revoke and confirm `403`.

## Error handling

- Invalid key → `401` JSON `{ error: "..." }`
- Valid key, forbidden book → `403`
- Approve/reject of non-pending request → `409` or `400`
- Axiom ingest failure must **not** fail the download response (log server-side, continue).

## Rollout

1. Ship role + collections + pages + export auth + Axiom wiring.
2. Root/Admin assigns Developer to partner accounts (e.g. Sanjib).
3. Partner generates key, requests Isha / Kena / Katha; Admin approves.
4. Share short API note (endpoints, headers, license, credit line).
5. Phase 2 (separate plan): migrate UI mutations to Clerk session; remove public DBI key.

## Open items for implementation plan

- Exact grant storage shape (embedded vs `apiBookGrants` collection).
- Whether Annotator/Editor users who become Developer keep their previous role or are switched (recommend: role is a single `perms` field today → switching to Developer replaces previous role; document that Admin can switch back).
- Soft rate limit numbers (defer unless needed).
- Axiom account credentials supplied by operator at deploy time.
