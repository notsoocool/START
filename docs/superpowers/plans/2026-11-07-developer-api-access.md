# Developer API Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Developers personal read-only API keys scoped to Admin-approved books, lock open download routes, and log partner pulls to Axiom — without touching live analysis content.

**Architecture:** New Mongo collections hold hashed keys, access requests, and book grants. `/api-access` lets Developers mint a key and request books. `/admin?tab=api-access` lets Admin/Root approve, reject, and revoke. Export routes (`/api/download*`) require a Clerk Admin/Root session or a valid Developer key whose grants include the requested book. Axiom receives one event per Developer-key export call; failures there must not fail the download.

**Tech Stack:** Next.js 14 App Router, Clerk, Mongoose/MongoDB, Bun test, Node `crypto`, Axiom HTTP ingest, React Query / existing UI patterns (shadcn, sonner).

**Spec:** `docs/superpowers/specs/2026-11-07-developer-api-access-design.md`

## Global Constraints

- Developer keys are **read-only** and only for **approved books**.
- Only **Root and Admin** assign the `Developer` role and approve/reject/revoke.
- Flow: generate key → request books → approve → key works.
- Keep `NEXT_PUBLIC_DBI_KEY` for non-export website helpers in Phase 1; it alone must **not** unlock `/api/download*`.
- `book=all` is denied for Developer keys.
- Never store or log the raw API key after the create response.
- Never rewrite analysis/shloka content for this feature. Tests use fixtures or a duplicate DB only.
- Axiom ingest failure must not fail the download response.
- Do not add `Co-Authored-By: Cursor`, `Made with Cursor`, or any similar trailer to commit messages.
- `perms` is a single string today: assigning `Developer` replaces the previous role (Admin can switch back).

## File map

| Path | Responsibility |
|---|---|
| `lib/db/apiKeyModel.ts` | Active/revoked personal keys (hash + prefix) |
| `lib/db/apiAccessRequestModel.ts` | Book access requests |
| `lib/db/apiBookGrantModel.ts` | Approved book grants per user |
| `lib/api/developerKey.ts` | Generate, hash, prefix helpers |
| `lib/api/axiom.ts` | Fire-and-forget Axiom ingest |
| `lib/auth/authorizeExport.ts` | Session Admin/Root or scoped Developer key |
| `lib/auth/requirePerms.ts` | Small Clerk + Perms role gate for JSON routes |
| `app/api/developer/key/route.ts` | GET status, POST create/regenerate, DELETE revoke own |
| `app/api/developer/requests/route.ts` | GET own requests+grants, POST new request |
| `app/api/admin/api-access/route.ts` | List requests/keys; approve/reject/revoke |
| `app/api/download/route.ts` (+ stream, size) | Call `authorizeExport` |
| `app/(dashboard)/api-access/page.tsx` | Developer UI |
| `components/global/apiAccessAdmin.tsx` | Admin tab UI |
| `app/(dashboard)/admin/page.tsx` | Wire tab |
| `components/global/navigation.tsx` | API Access nav link |
| `components/global/user-perms.tsx` | Developer in role dropdown |
| `app/api/users/route.ts` | Include Developer in role filter/counts |
| `lib/hooks/use-api.ts` | Extend `perms` union |

---

### Task 1: Developer role in types and permission UI

**Files:**
- Modify: `lib/hooks/use-api.ts`
- Modify: `components/global/user-perms.tsx`
- Modify: `app/api/users/route.ts`
- Test: manual / typecheck (no unit test required)

**Interfaces:**
- Consumes: existing `Perms.perms` string field
- Produces: `"Developer"` accepted everywhere roles are listed

- [ ] **Step 1: Extend the User perms union**

In `lib/hooks/use-api.ts`, change:

```ts
perms: "User" | "Annotator" | "Editor" | "Admin" | "Root";
```

to:

```ts
perms: "User" | "Annotator" | "Editor" | "Admin" | "Root" | "Developer";
```

- [ ] **Step 2: Allow filtering by Developer in `/api/users`**

In `app/api/users/route.ts`, add `"Developer"` to the role allow-list array and to any `countsByRole` / aggregation that lists roles.

- [ ] **Step 3: Add Developer to the permissions dropdown**

In `components/global/user-perms.tsx`:
- Add `Developer` to the local `User["perms"]` union and role count defaults.
- Add a `SelectItem value="Developer"`.
- Root and Admin may assign it (same rules as assigning Annotator/Editor; only Root may assign Admin/Root as today).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`  
Expected: no new errors from these files.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/use-api.ts components/global/user-perms.tsx app/api/users/route.ts
git commit -m "$(cat <<'EOF'
Add Developer to roles and the permissions UI.

EOF
)"
```

If a hook injects a Cursor co-author trailer, rewrite with `git commit-tree` + `git reset --soft` before pushing.

---

### Task 2: Key crypto helpers

**Files:**
- Create: `lib/api/developerKey.ts`
- Create: `lib/api/developerKey.test.ts`

**Interfaces:**
- Consumes: Node `crypto`
- Produces:
  - `generateDeveloperKey(): { rawKey: string; keyHash: string; keyPrefix: string }`
  - `hashDeveloperKey(rawKey: string): string`
  - `keyPrefixFromRaw(rawKey: string): string`

- [ ] **Step 1: Write the failing test**

Create `lib/api/developerKey.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
	generateDeveloperKey,
	hashDeveloperKey,
	keyPrefixFromRaw,
} from "./developerKey";

describe("generateDeveloperKey", () => {
	test("returns a sk_live_ secret, matching hash, and prefix", () => {
		const { rawKey, keyHash, keyPrefix } = generateDeveloperKey();
		expect(rawKey.startsWith("sk_live_")).toBe(true);
		expect(rawKey.length).toBeGreaterThan(40);
		expect(keyHash).toBe(hashDeveloperKey(rawKey));
		expect(keyPrefix).toBe(keyPrefixFromRaw(rawKey));
		expect(keyPrefix.length).toBeGreaterThanOrEqual(10);
	});

	test("two generations differ", () => {
		const a = generateDeveloperKey();
		const b = generateDeveloperKey();
		expect(a.rawKey).not.toBe(b.rawKey);
		expect(a.keyHash).not.toBe(b.keyHash);
	});
});

describe("hashDeveloperKey", () => {
	test("is stable and not the raw key", () => {
		const raw = "sk_live_test_value_for_hash";
		expect(hashDeveloperKey(raw)).toBe(hashDeveloperKey(raw));
		expect(hashDeveloperKey(raw)).not.toBe(raw);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/api/developerKey.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

Create `lib/api/developerKey.ts`:

```ts
import { createHash, randomBytes } from "crypto";

export function hashDeveloperKey(rawKey: string): string {
	return createHash("sha256").update(rawKey).digest("hex");
}

export function keyPrefixFromRaw(rawKey: string): string {
	return rawKey.slice(0, 12);
}

export function generateDeveloperKey(): {
	rawKey: string;
	keyHash: string;
	keyPrefix: string;
} {
	const rawKey = `sk_live_${randomBytes(24).toString("base64url")}`;
	return {
		rawKey,
		keyHash: hashDeveloperKey(rawKey),
		keyPrefix: keyPrefixFromRaw(rawKey),
	};
}
```

- [ ] **Step 4: Run tests**

Run: `bun test lib/api/developerKey.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/api/developerKey.ts lib/api/developerKey.test.ts
git commit -m "$(cat <<'EOF'
Add helpers that mint and hash Developer API keys.

EOF
)"
```

---

### Task 3: Mongo models for keys, requests, grants

**Files:**
- Create: `lib/db/apiKeyModel.ts`
- Create: `lib/db/apiAccessRequestModel.ts`
- Create: `lib/db/apiBookGrantModel.ts`

**Interfaces:**
- Consumes: mongoose patterns from `lib/db/permissionsModel.ts`
- Produces: default exports `ApiKey`, `ApiAccessRequest`, `ApiBookGrant`

- [ ] **Step 1: Create `apiKeyModel.ts`**

```ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApiKey extends Document {
	userId: string;
	keyPrefix: string;
	keyHash: string;
	status: "active" | "revoked";
	createdAt: Date;
	revokedAt?: Date | null;
	lastUsedAt?: Date | null;
}

const schema = new Schema<IApiKey>({
	userId: { type: String, required: true, index: true },
	keyPrefix: { type: String, required: true },
	keyHash: { type: String, required: true, unique: true },
	status: { type: String, enum: ["active", "revoked"], default: "active" },
	createdAt: { type: Date, default: Date.now },
	revokedAt: { type: Date, default: null },
	lastUsedAt: { type: Date, default: null },
});

const ApiKey: Model<IApiKey> =
	mongoose.models.ApiKey || mongoose.model<IApiKey>("ApiKey", schema);

export default ApiKey;
```

- [ ] **Step 2: Create `apiAccessRequestModel.ts`**

Fields: `userId`, `userName`, `books: string[]`, `note` (optional), `status: pending|approved|rejected`, `reviewedBy`, `reviewedAt`, `reviewNote`, `createdAt`.

- [ ] **Step 3: Create `apiBookGrantModel.ts`**

Fields: `userId`, `book`, `requestId` (ObjectId ref string), `grantedBy`, `grantedAt`, `revokedAt` (nullable). Index `{ userId: 1, book: 1 }` unique among non-revoked grants (enforce in app by querying `revokedAt: null`).

- [ ] **Step 4: Commit**

```bash
git add lib/db/apiKeyModel.ts lib/db/apiAccessRequestModel.ts lib/db/apiBookGrantModel.ts
git commit -m "$(cat <<'EOF'
Add Mongo models for Developer keys, requests, and book grants.

EOF
)"
```

---

### Task 4: Axiom client

**Files:**
- Create: `lib/api/axiom.ts`
- Create: `lib/api/axiom.test.ts`

**Interfaces:**
- Consumes: `process.env.AXIOM_TOKEN`, `process.env.AXIOM_DATASET`
- Produces: `logApiAccess(event: ApiAccessEvent): Promise<void>` (never throws to callers — swallow after console.error)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { logApiAccess } from "./axiom";

describe("logApiAccess", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		process.env.AXIOM_TOKEN = "test-token";
		process.env.AXIOM_DATASET = "start-api-access";
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		delete process.env.AXIOM_TOKEN;
		delete process.env.AXIOM_DATASET;
	});

	test("posts the event to Axiom when env is set", async () => {
		const calls: unknown[] = [];
		globalThis.fetch = mock(async (url: any, init?: any) => {
			calls.push({ url: String(url), body: init?.body });
			return new Response(null, { status: 200 });
		}) as any;

		await logApiAccess({
			userId: "user_1",
			keyPrefix: "sk_live_abcd",
			book: "ईशोपनिषद्",
			route: "/api/download",
			status: 200,
			ip: "1.2.3.4",
			userAgent: "curl",
			durationMs: 12,
		});

		expect(calls.length).toBe(1);
		expect(String((calls[0] as any).url)).toContain("start-api-access");
		expect(String((calls[0] as any).body)).toContain("user_1");
	});

	test("no-ops when token is missing", async () => {
		delete process.env.AXIOM_TOKEN;
		let called = false;
		globalThis.fetch = mock(async () => {
			called = true;
			return new Response(null, { status: 200 });
		}) as any;
		await logApiAccess({
			userId: "user_1",
			keyPrefix: "sk_live_abcd",
			book: "x",
			route: "/api/download",
			status: 200,
			ip: null,
			userAgent: null,
			durationMs: 1,
		});
		expect(called).toBe(false);
	});
});
```

- [ ] **Step 2: Run to verify fail**

Run: `bun test lib/api/axiom.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
export type ApiAccessEvent = {
	userId: string;
	keyPrefix: string;
	book: string;
	route: string;
	status: number;
	ip: string | null;
	userAgent: string | null;
	durationMs: number;
	timestamp?: string;
};

export async function logApiAccess(event: ApiAccessEvent): Promise<void> {
	const token = process.env.AXIOM_TOKEN;
	const dataset = process.env.AXIOM_DATASET;
	if (!token || !dataset) return;

	try {
		await fetch(`https://api.axiom.co/v1/datasets/${dataset}/ingest`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify([
				{
					...event,
					timestamp: event.timestamp ?? new Date().toISOString(),
				},
			]),
		});
	} catch (error) {
		console.error("Axiom ingest failed:", error);
	}
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add lib/api/axiom.ts lib/api/axiom.test.ts
git commit -m "$(cat <<'EOF'
Add a fire-and-forget Axiom client for API access events.

EOF
)"
```

---

### Task 5: Export authorization helper

**Files:**
- Create: `lib/auth/authorizeExport.ts`
- Create: `lib/auth/authorizeExport.test.ts`

**Interfaces:**
- Consumes: Clerk `currentUser`, `Perms`, `ApiKey`, `ApiBookGrant`, `hashDeveloperKey`
- Produces:
  - `extractBearerOrApiKey(req: Request): string | null`
  - `authorizeExport(req: Request, book: string): Promise<ExportAuth | { error: string; status: number }>`
  - `ExportAuth = { kind: "session"; userId: string } | { kind: "apiKey"; userId: string; keyPrefix: string; keyId: string }`

Logic:
1. If Clerk user with perms Admin or Root → `{ kind: "session", userId }` (any book, including `all`).
2. Else extract key from `Authorization: Bearer …` or `X-API-Key`.
3. Hash and find `ApiKey` with `status: "active"`. Missing → `{ error, status: 401 }`.
4. If `book === "all"` → `{ error, status: 403 }`.
5. Else require `ApiBookGrant` with `userId`, `book`, `revokedAt: null`. Missing → 403.
6. Touch `lastUsedAt` on the key (best-effort).

- [ ] **Step 1: Write unit tests for `extractBearerOrApiKey` and pure decision helpers**

Prefer testing `extractBearerOrApiKey` fully, and a small pure function `decideExportAccess({ sessionRole, book, hasGrant, hasActiveKey })` if DB mocking is awkward. Keep at least:

```ts
test("Bearer header wins", () => {
  const req = new Request("http://x", { headers: { Authorization: "Bearer sk_live_abc", "X-API-Key": "other" } });
  expect(extractBearerOrApiKey(req)).toBe("sk_live_abc");
});

test("X-API-Key used when Bearer missing", () => {
  const req = new Request("http://x", { headers: { "X-API-Key": "sk_live_abc" } });
  expect(extractBearerOrApiKey(req)).toBe("sk_live_abc");
});
```

For grant decisions, test:

```ts
expect(decideExportAccess({ sessionRole: "Admin", book: "all", hasActiveKey: false, hasGrant: false }).ok).toBe(true);
expect(decideExportAccess({ sessionRole: null, book: "all", hasActiveKey: true, hasGrant: true }).status).toBe(403);
expect(decideExportAccess({ sessionRole: null, book: "ईशोपनिषद्", hasActiveKey: true, hasGrant: false }).status).toBe(403);
expect(decideExportAccess({ sessionRole: null, book: "ईशोपनिषद्", hasActiveKey: true, hasGrant: true }).ok).toBe(true);
expect(decideExportAccess({ sessionRole: null, book: "x", hasActiveKey: false, hasGrant: false }).status).toBe(401);
```

- [ ] **Step 2: Implement `authorizeExport.ts` with those helpers**

- [ ] **Step 3: Run `bun test lib/auth/authorizeExport.test.ts` — PASS**

- [ ] **Step 4: Commit**

```bash
git add lib/auth/authorizeExport.ts lib/auth/authorizeExport.test.ts
git commit -m "$(cat <<'EOF'
Authorize analysis exports by Admin session or scoped Developer key.

EOF
)"
```

---

### Task 6: Developer key and request API routes

**Files:**
- Create: `lib/auth/requirePerms.ts`
- Create: `app/api/developer/key/route.ts`
- Create: `app/api/developer/requests/route.ts`

**Interfaces:**
- `requirePerms(allowed: string[]): Promise<{ userId; name; perms } | NextResponse>`
- Key route: GET (status, never raw), POST (create/regenerate — returns `rawKey` once), DELETE (revoke own active)
- Requests route: GET `{ requests, grants }`, POST `{ books: string[], note?: string }`

Rules:
- Only `Developer`, `Admin`, or `Root` may call these.
- POST key: revoke any existing active key for user, insert new active.
- POST request: require `books.length >= 1`, status `pending`. Admin/Root requesting for themselves is allowed but unusual; still fine.
- Do not accept `DB-Access-Key` as identity here — Clerk session only.

- [ ] **Step 1: Implement `requirePerms`**

```ts
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Perms from "@/lib/db/permissionsModel";

export async function requirePerms(allowed: string[]) {
	await dbConnect();
	const user = await currentUser();
	if (!user) {
		return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
	}
	const row = await Perms.findOne({ userID: user.id });
	if (!row || !allowed.includes(row.perms)) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
	return {
		userId: user.id,
		name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || row.name,
		perms: row.perms as string,
	};
}
```

- [ ] **Step 2: Implement key route**

GET → `{ status: "none"|"active"|"revoked", keyPrefix?: string, createdAt?, lastUsedAt? }` (latest key for user).  
POST → generate, revoke previous active, save, return `{ rawKey, keyPrefix, createdAt }`.  
DELETE → set active key to revoked.

- [ ] **Step 3: Implement requests route**

GET → user's requests newest first + non-revoked grants.  
POST → validate books array of non-empty strings; create pending request.

- [ ] **Step 4: Smoke with local server only against duplicate DB if available; otherwise leave for Task 10 UI**

- [ ] **Step 5: Commit**

```bash
git add lib/auth/requirePerms.ts app/api/developer/key/route.ts app/api/developer/requests/route.ts
git commit -m "$(cat <<'EOF'
Add Developer routes to mint keys and request book access.

EOF
)"
```

---

### Task 7: Admin API access management routes

**Files:**
- Create: `app/api/admin/api-access/route.ts`

**Interfaces:**
- GET `?status=pending|all` → requests (+ key summary per userId)
- POST body discriminated by `action`:
  - `{ action: "approve", requestId }` → set request approved; upsert grants for each book (`revokedAt: null`)
  - `{ action: "reject", requestId, reviewNote? }`
  - `{ action: "revokeGrant", grantId }`
  - `{ action: "revokeKey", userId }`

Only Admin/Root via `requirePerms(["Admin","Root"])`.

- [ ] **Step 1: Implement GET list**

Join lightly in app code: for each distinct `userId` in page, fetch latest ApiKey prefix/status.

- [ ] **Step 2: Implement approve**

- Load pending request; 404/409 if missing/not pending.
- Set status approved, reviewedBy, reviewedAt.
- For each book: if an active grant exists, skip; else create grant.
- Return updated request + grants.

- [ ] **Step 3: Implement reject / revokeGrant / revokeKey**

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/api-access/route.ts
git commit -m "$(cat <<'EOF'
Add Admin routes to approve, reject, and revoke API access.

EOF
)"
```

---

### Task 8: Lock download / stream / size routes

**Files:**
- Modify: `app/api/download/route.ts`
- Modify: `app/api/download/stream/route.ts`
- Modify: `app/api/download/size/route.ts`

**Interfaces:**
- Consumes: `authorizeExport`, `logApiAccess`
- Produces: same download payloads as today when authorized

- [ ] **Step 1: At the top of each GET, after reading `book`**

```ts
const started = Date.now();
const auth = await authorizeExport(request, book);
if ("error" in auth) {
  return NextResponse.json({ error: auth.error }, { status: auth.status });
}
```

- [ ] **Step 2: After successful response construction for apiKey kind, call Axiom**

```ts
if (auth.kind === "apiKey") {
  void logApiAccess({
    userId: auth.userId,
    keyPrefix: auth.keyPrefix,
    book,
    route: "/api/download", // or stream/size
    status: 200,
    ip: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
    durationMs: Date.now() - started,
  });
}
```

Also log on 403/401 path for apiKey attempts when a key was presented (optional but useful — if easy).

- [ ] **Step 3: Confirm public DBI key alone cannot download**

With no Clerk cookie and only `DB-Access-Key: $NEXT_PUBLIC_DBI_KEY`, curl download → 401.

- [ ] **Step 4: Commit**

```bash
git add app/api/download/route.ts app/api/download/stream/route.ts app/api/download/size/route.ts
git commit -m "$(cat <<'EOF'
Require Admin session or scoped Developer key for downloads.

EOF
)"
```

---

### Task 9: `/api-access` page

**Files:**
- Create: `app/(dashboard)/api-access/page.tsx`
- Modify: `components/global/navigation.tsx`

**Interfaces:**
- Consumes: `/api/getCurrentUser`, `/api/developer/key`, `/api/developer/requests`, `/api/books` (for book titles)
- Gate: if perms not in Developer/Admin/Root → toast + redirect `/`

UI sections:
1. Key card: status, Generate / Regenerate (confirm dialog), show raw key once in a copyable field, masked prefix afterward.
2. Request form: multi-select or checklist of book names from `/api/books` tree top-level titles; note textarea; Submit.
3. Tables: my requests; my grants.
4. Usage blurb: headers, example curl, license/credit reminder.

- [ ] **Step 1: Add nav link when `currentUser.perms` is Developer, Admin, or Root**

Label: `API Access`, href `/api-access`.

- [ ] **Step 2: Build the page with existing Card/Button/Dialog patterns**

- [ ] **Step 3: Manual check as non-Developer → redirected**

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/api-access/page.tsx" components/global/navigation.tsx
git commit -m "$(cat <<'EOF'
Add the Developer API Access page and nav link.

EOF
)"
```

---

### Task 10: Admin tab for API access

**Files:**
- Create: `components/global/apiAccessAdmin.tsx`
- Modify: `app/(dashboard)/admin/page.tsx`

**Interfaces:**
- Consumes: `/api/admin/api-access`
- Produces: pending queue + history + actions

- [ ] **Step 1: Add `"api-access"` to tab allow-list, SelectItem, TabsTrigger, TabsContent**

- [ ] **Step 2: Implement `apiAccessAdmin.tsx`**

- Pending list with Approve / Reject
- History filter
- Per-row revoke grant / revoke key
- sonner toasts on success/error

- [ ] **Step 3: Commit**

```bash
git add components/global/apiAccessAdmin.tsx "app/(dashboard)/admin/page.tsx"
git commit -m "$(cat <<'EOF'
Add an Admin tab to track and decide API access requests.

EOF
)"
```

---

### Task 11: Env docs and operator checklist (Axiom)

**Files:**
- Create: `docs/superpowers/specs/2026-11-07-developer-api-access-operator-notes.md`  
  (short; not a second design — setup steps only)

Contents:
1. Create free Axiom account → dataset `start-api-access` → API token with ingest.
2. Set `AXIOM_TOKEN` and `AXIOM_DATASET` in Vercel + `.env.local` (never `NEXT_PUBLIC_`).
3. Assign partner `Developer` in Admin → Permissions.
4. Partner opens `/api-access`, generates key, requests Isha/Kena/Katha (exact DB titles).
5. Admin approves on `/admin?tab=api-access`.
6. Partner curl example with Bearer key.
7. Credit line + CC BY-NC-SA reminder.
8. Testing rule: use duplicate DB / fixtures; do not mutate production analysis rows.

- [ ] **Step 1: Write the notes file**

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-11-07-developer-api-access-operator-notes.md
git commit -m "$(cat <<'EOF'
Document Axiom setup and partner API access operator steps.

EOF
)"
```

---

### Task 12: Verification against duplicate data only

**Files:** none (procedure)

- [ ] **Step 1: If a duplicate Mongo URI exists, point local `.env.local` `MONGO_URI` at it for this test. If not, use empty grants + fixture unit tests only — do not invent production writes.**

- [ ] **Step 2: Scripted checks**

1. No auth → download 401.  
2. DBI public key only → download 401.  
3. Admin session cookie → download 200 for a known book.  
4. Developer key without grant → 403.  
5. After approve → 200 for that book, 403 for another.  
6. `book=all` with Developer key → 403.  
7. Axiom receives an event when env is set (check Axiom UI).  
8. Revoke key → 401.

- [ ] **Step 3: Commit nothing unless fixes were needed; if fixes, commit those separately with clear messages.**

---

## Self-review checklist (plan author)

- Spec coverage: role, page, keys, requests, admin tab, export auth, Axiom, live-data rule, Phase 1 vs Phase 2 — each has a task.
- No TBD placeholders in steps.
- Names consistent: `authorizeExport`, `logApiAccess`, `generateDeveloperKey`, `ApiBookGrant`.
- Public DBI key explicitly excluded from export auth.
- Commits omit Cursor attribution.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-11-07-developer-api-access.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
**2. Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
