# Shloka Cluster Undo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Root, Admin, and an assigned Editor undo a shloka cluster and restore the original cards and sentence numbers.

**Architecture:** Combine writes a `clusterUndo` snapshot onto the new shloka. Undo reads that snapshot, moves analysis rows back by the stored sentence map, recreates the source shloka documents, and deletes the cluster.

**Tech Stack:** Next.js 14, MongoDB via Mongoose, Bun test, shadcn Dialog.

**Spec:** `docs/superpowers/specs/2026-09-25-shloka-cluster-undo-design.md`

## Global Constraints

- Do not rewrite `word`, `poem`, `anvaya_no`, or `kaaraka_sambandha` during undo.
- Only Root, Admin, and an Editor in the book's group may undo. Annotators cannot.
- Confirm with the shadcn Dialog, not `window.confirm`.
- Clusters without a stored snapshot cannot be undone.
- Do not add a Cursor co-author trailer to commits.

---

### Task 1: Snapshot helper

**Files:**
- Modify: `lib/utils/shlokaCluster.ts`
- Test: `lib/utils/shlokaCluster.test.ts`

**Interfaces:**
- Produces: `buildClusterUndo(sources, maps): ClusterSourceSnapshot[]` where each snapshot has `slokano`, `spart`, `userPublished`, `groupPublished`, `locked`, `owner`, and `sentnoMap: { from, to, rows }[]`.

- [x] Store row counts beside each original-to-cluster sentence mapping.
- [x] Test two sources whose sentence 1 becomes sentences 1 and 2, with two rows on the first sentence.

### Task 2: Persist the snapshot and undo it

**Files:**
- Modify: `lib/db/newShlokaModel.ts`
- Modify: `app/api/shlokas/cluster/route.ts`
- Create: `app/api/shlokas/cluster/undo/route.ts`
- Create: `lib/auth/authorizeClusterEdit.ts`
- Modify: `lib/db/usageHistoryModel.ts`

**Interfaces:**
- Consumes: `buildClusterUndo`, `authorizeClusterEdit`
- Produces: `POST /api/shlokas/cluster/undo` body `{ shlokaId: string }`, response `{ slokanos: string[] }`

- [x] Save `clusterUndo` on the cluster shloka during combine.
- [x] Undo restores analysis `slokano` and `sentno`, recreates source shlokas, deletes the cluster, and logs `shloka_uncluster`.
- [x] Refuse when the row count changed or a source number already exists.

### Task 3: Undo button

**Files:**
- Modify: `components/global/ShlokaCard.tsx`
- Modify: `app/(dashboard)/books/[book]/[part1]/[part2]/[chaptno]/[id]/page.tsx`

- [x] Show "Undo combine" for Root, Admin, and an assigned Editor when `clusterUndo` has at least two sources.
- [x] Confirm in a shadcn dialog, then return to the chapter list.
