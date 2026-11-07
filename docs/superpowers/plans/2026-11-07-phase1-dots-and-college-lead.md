# Phase 1: Publish Dots + College Lead Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix green/blue publish status indicators so they match reality, and let a college group lead assign Annotator/Editor to members of their own group so Admin stops doing that by hand.

**Architecture:** Status APIs aggregate with `$min`/`$max` (or boolean all/any) instead of `$first`, and the books UI shows chapter status + the same legend for all roles. Groups gain a `leadIds` field; a lead-only API can mutate members and set perms to Annotator/Editor only for users in their group.

**Tech Stack:** Next.js App Router, Mongoose, Clerk, existing `requirePerms` / Perms / Group models, shadcn UI.

**Spec:** `docs/superpowers/specs/2026-11-07-start-access-model-design.md` (Phase 1 slice only)

## Global Constraints

- Do **not** build User→Editor request flow, full access-model rewrite, or sandbox merges in this phase.
- Leads must **never** grant Admin/Root or change users outside their group.
- Publish dots: green = `userPublished`, blue = `groupPublished`; same visibility for all signed-in roles.
- Prefer minimal diffs in existing Admin group UI over a new app.

---

### Task 1: Status aggregation helpers + books/status API

**Files:**
- Create: `lib/books/publishStatus.ts`
- Create: `lib/books/publishStatus.test.ts`
- Modify: `app/api/books/status/route.ts`

**Interfaces:**
- Produces: `aggregateFlag(values: boolean[]): { all: boolean; any: boolean; partial: boolean }` and book/chapter status shape `{ userPublished, groupPublished, locked, userPublishedPartial?, groupPublishedPartial?, lockedPartial? }`

- [ ] **Step 1:** Write tests for all-true / all-false / mixed → all/any/partial
- [ ] **Step 2:** Implement helpers
- [ ] **Step 3:** Change `/api/books/status` to use `$min`/`$max` (or collect then reduce) instead of `$first` for book and chapter groups
- [ ] **Step 4:** Commit

---

### Task 2: Books tree API + UI dots

**Files:**
- Modify: `app/api/books/route.ts` (status `$group` stages)
- Modify: `app/(dashboard)/books/page.tsx` (dot rendering + chapter status)
- Modify: `components/global/manageStatus.tsx` if it assumes boolean-only book status

- [ ] **Step 1:** At chapter `$group`, compute status with `$min`/`$max` on booleans (Mongo treats true=1)
- [ ] **Step 2:** When rolling up to book, derive book status from chapter statuses (all/any), keep per-chapter status on tree nodes
- [ ] **Step 3:** Show green/blue for all roles; use partial styling (e.g. ring/half) when `partial`
- [ ] **Step 4:** Manual check: mixed-publish book shows partial at book, correct dots on chapters
- [ ] **Step 5:** Commit

---

### Task 3: College lead data model + Admin can set lead

**Files:**
- Modify: `lib/db/groupModel.ts` — add `leadIds: string[]`
- Modify: `app/api/groups/[id]/route.ts` — Admin/Root can set `leadIds`; require auth on group routes
- Modify: `components/global/groupAdmin.tsx` — UI to pick leads from members

- [ ] **Step 1:** Add `leadIds` to schema (default `[]`)
- [ ] **Step 2:** Gate group GET/POST/PUT/DELETE with `requirePerms(["Admin","Root"])` (except lead-scoped routes in Task 4)
- [ ] **Step 3:** Allow Admin to set `leadIds` ⊆ `members`
- [ ] **Step 4:** Commit

---

### Task 4: Lead-scoped member + role management

**Files:**
- Create: `app/api/groups/[id]/lead/route.ts` (or `/api/college-lead/...`)
- Modify: `app/api/updateUser/route.ts` or dedicated lead role endpoint
- Modify: `components/global/groupAdmin.tsx` or small `CollegeLeadPanel` on group-info for leads

**Rules:**
- Caller must be in `group.leadIds`
- May add/remove members only on that group
- May set target user’s `perms` only to `User` | `Annotator` | `Editor`
- Must not elevate to Admin/Root; must not change users not in (or being added to) this group

- [ ] **Step 1:** API: add/remove member
- [ ] **Step 2:** API: set Annotator/Editor/User for a member
- [ ] **Step 3:** UI for leads (group-info or admin subset)
- [ ] **Step 4:** Commit

---

### Task 5 (recommended extras, same PR if cheap)

**Files:**
- Modify: `app/api/uploadJson/route.ts` — set `owner` from Clerk user; require Admin
- Modify: `app/api/books/publish/route.ts` + `publish/chapter` — `requirePerms(["Admin","Root"])`

- [ ] **Step 1:** Upload sets `owner: user.id`
- [ ] **Step 2:** Publish routes Admin-only
- [ ] **Step 3:** Commit

---

## Done when

- Mixed chapter publish no longer shows a random single-shloka green/blue at book level
- Non-Admin users see green when a book is public
- Admin designates a lead; that lead can add a student and set them Annotator/Editor without Root
