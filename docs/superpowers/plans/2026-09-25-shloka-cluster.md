# Shloka Cluster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combine two or more existing shlokas in one chapter into a single shloka card and analysis page while keeping each source shloka’s sentences as separate `sentno` groups.

**Architecture:** Pure helpers decide the cluster label, the joined `spart`, and the `sentno` remap. A POST route applies that plan in one Mongo transaction: insert the cluster shloka, rewrite analysis `slokano` + `sentno`, delete the source shloka documents. The chapter sidebar selects ids and calls that route.

**Tech Stack:** Next.js 14 App Router, MongoDB via Mongoose, Bun test, React Query, sonner toasts.

**Spec:** `docs/superpowers/specs/2026-09-25-shloka-cluster-design.md`

## Global Constraints

- Do not concatenate word rows from different source shlokas into one sentence.
- Do not rewrite `word`, `poem`, `anvaya_no`, or `kaaraka_sambandha` during a cluster.
- Cluster `slokano` is `${first}-${last}` after leading-integer sort.
- Join `spart` with `#` and nothing else.
- Reject locked shlokas, already-clustered `slokano` values (contain `-`), cross-chapter selections, and a label that already exists.
- Do not add `Co-Authored-By: Cursor`, `Made with Cursor`, or any similar trailer to commit messages.
- Do not migrate bookmarks or discussions.

---

### Task 1: Cluster planning helpers

**Files:**
- Create: `lib/utils/shlokaCluster.ts`
- Create: `lib/utils/shlokaCluster.test.ts`
- Modify: `package.json` (scripts.test)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `compareSlokano(a: string, b: string): number`
  - `clusterLabel(slokanos: string[]): string`
  - `joinSparts(sparts: string[]): string`
  - `sentnoMaps(sources: { sentnos: string[] }[]): Map<string, string>[]`

- [ ] **Step 1: Add the test script**

In `package.json` `scripts`, add:

```json
"test": "bun test"
```

- [ ] **Step 2: Write the failing test**

Create `lib/utils/shlokaCluster.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
	clusterLabel,
	compareSlokano,
	joinSparts,
	sentnoMaps,
} from "./shlokaCluster";

describe("compareSlokano", () => {
	test("orders by leading integer, then full string", () => {
		const sorted = ["052", "051-052", "051", "10"].sort(compareSlokano);
		expect(sorted).toEqual(["10", "051", "051-052", "052"]);
	});
});

describe("clusterLabel", () => {
	test("uses first and last after numeric sort", () => {
		expect(clusterLabel(["052", "051"])).toBe("051-052");
		expect(clusterLabel(["053", "051", "052"])).toBe("051-053");
	});

	test("rejects fewer than two values", () => {
		expect(() => clusterLabel(["051"])).toThrow("at least two");
	});

	test("rejects an existing cluster number", () => {
		expect(() => clusterLabel(["051-052", "053"])).toThrow("already clustered");
	});
});

describe("joinSparts", () => {
	test("joins trimmed texts with # and drops empties", () => {
		expect(joinSparts(["  अथ ", "", "द्वितीयः  "])).toBe("अथ#द्वितीयः");
	});
});

describe("sentnoMaps", () => {
	test("keeps each source sentence intact and shifts later sources", () => {
		const maps = sentnoMaps([
			{ sentnos: ["1", "1", "2"] },
			{ sentnos: ["1"] },
		]);
		expect(maps[0].get("1")).toBe("1");
		expect(maps[0].get("2")).toBe("2");
		expect(maps[1].get("1")).toBe("3");
	});
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun test lib/utils/shlokaCluster.test.ts`

Expected: FAIL because `./shlokaCluster` cannot be resolved.

- [ ] **Step 4: Write the helpers**

Create `lib/utils/shlokaCluster.ts`:

```ts
/** Leading integer of a shloka number. "051-052" → 51. Non-numeric → null. */
export function leadingSlokano(slokano: string): number | null {
	const match = /^(\d+)/.exec(slokano.trim());
	if (!match) return null;
	return Number(match[1]);
}

export function compareSlokano(a: string, b: string): number {
	const na = leadingSlokano(a);
	const nb = leadingSlokano(b);
	if (na !== null && nb !== null && na !== nb) return na - nb;
	return a.localeCompare(b);
}

export function clusterLabel(slokanos: string[]): string {
	if (slokanos.length < 2) {
		throw new Error("Select at least two shlokas");
	}
	if (slokanos.some((value) => value.includes("-"))) {
		throw new Error("A selected shloka is already clustered");
	}
	const sorted = [...slokanos].sort(compareSlokano);
	return `${sorted[0]}-${sorted[sorted.length - 1]}`;
}

export function joinSparts(sparts: string[]): string {
	return sparts
		.map((part) => part.trim())
		.filter((part) => part.length > 0)
		.join("#");
}

/**
 * Maps each source's existing sentno values onto a fresh sequence.
 * Rows that share a sentno inside one source still share one sentno.
 * The next source starts after the previous source's last sentence.
 */
export function sentnoMaps(sources: { sentnos: string[] }[]): Map<string, string>[] {
	let next = 1;
	return sources.map((source) => {
		const unique = [...new Set(source.sentnos)].sort((a, b) => {
			const na = Number(a);
			const nb = Number(b);
			if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
			return a.localeCompare(b);
		});
		const map = new Map<string, string>();
		for (const sentno of unique) {
			map.set(sentno, String(next));
			next += 1;
		}
		return map;
	});
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test lib/utils/shlokaCluster.test.ts`

Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json lib/utils/shlokaCluster.ts lib/utils/shlokaCluster.test.ts
git commit -m "$(cat <<'EOF'
Add helpers that plan a shloka cluster without merging sentences.

EOF
)"
```

---

### Task 2: Cluster API

**Files:**
- Create: `app/api/shlokas/cluster/route.ts`
- Test: `lib/utils/shlokaCluster.test.ts` (already covers the planning rules this route calls)

**Interfaces:**
- Consumes: `clusterLabel`, `compareSlokano`, `joinSparts`, `sentnoMaps` from `lib/utils/shlokaCluster.ts`
- Produces: `POST /api/shlokas/cluster` with JSON body `{ shlokaIds: string[] }`
  - 200 `{ shlokaId: string, slokano: string }`
  - 400 `{ error: string }` when the selection is invalid
  - 401 when `DB-Access-Key` is missing or wrong

- [ ] **Step 1: Write the route**

Create `app/api/shlokas/cluster/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/connect";
import Shloka from "@/lib/db/newShlokaModel";
import Analysis from "@/lib/db/newAnalysisModel";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";
import {
	clusterLabel,
	compareSlokano,
	joinSparts,
	sentnoMaps,
} from "@/lib/utils/shlokaCluster";

export const dynamic = "force-dynamic";

const sameLocation = (
	a: { book?: string; part1?: string | null; part2?: string | null; chaptno?: string },
	b: { book?: string; part1?: string | null; part2?: string | null; chaptno?: string }
) =>
	a.book === b.book &&
	(a.part1 ?? null) === (b.part1 ?? null) &&
	(a.part2 ?? null) === (b.part2 ?? null) &&
	a.chaptno === b.chaptno;

export async function POST(req: NextRequest) {
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	const body = await req.json().catch(() => null);
	const shlokaIds: unknown = body?.shlokaIds;
	if (!Array.isArray(shlokaIds) || shlokaIds.length < 2 || shlokaIds.some((id) => typeof id !== "string")) {
		return NextResponse.json({ error: "Select at least two shlokas" }, { status: 400 });
	}

	await dbConnect();

	const shlokas = await Shloka.find({ _id: { $in: shlokaIds } });
	if (shlokas.length !== shlokaIds.length) {
		return NextResponse.json({ error: "One or more shlokas were not found" }, { status: 400 });
	}

	const anchor = shlokas[0];
	if (!shlokas.every((shloka) => sameLocation(shloka, anchor))) {
		return NextResponse.json({ error: "Selected shlokas must be in the same chapter" }, { status: 400 });
	}
	if (shlokas.some((shloka) => shloka.locked)) {
		return NextResponse.json({ error: "A selected shloka is locked" }, { status: 400 });
	}

	let label: string;
	try {
		label = clusterLabel(shlokas.map((shloka) => String(shloka.slokano)));
	} catch (error) {
		return NextResponse.json({ error: (error as Error).message }, { status: 400 });
	}

	const ordered = [...shlokas].sort((a, b) => compareSlokano(String(a.slokano), String(b.slokano)));
	const location = {
		book: anchor.book,
		part1: anchor.part1 ?? null,
		part2: anchor.part2 ?? null,
		chaptno: anchor.chaptno,
	};

	const existing = await Shloka.findOne({ ...location, slokano: label });
	if (existing) {
		return NextResponse.json({ error: `Shloka ${label} already exists in this chapter` }, { status: 400 });
	}

	const analysesBySource = await Promise.all(
		ordered.map((shloka) =>
			Analysis.find({
				...location,
				slokano: shloka.slokano,
			})
		)
	);
	const maps = sentnoMaps(
		analysesBySource.map((rows) => ({
			sentnos: rows.map((row) => String(row.sentno)),
		}))
	);

	const session = await mongoose.startSession();
	try {
		let createdId = "";
		await session.withTransaction(async () => {
			const created = await Shloka.create(
				[
					{
						...location,
						slokano: label,
						spart: joinSparts(ordered.map((shloka) => String(shloka.spart ?? ""))),
						userPublished: ordered.every((shloka) => shloka.userPublished === true),
						groupPublished: ordered.every((shloka) => shloka.groupPublished === true),
						locked: false,
						owner: ordered[0].owner ?? null,
					},
				],
				{ session }
			);
			createdId = String(created[0]._id);

			for (let i = 0; i < ordered.length; i++) {
				const source = ordered[i];
				const map = maps[i];
				for (const [from, to] of map) {
					await Analysis.updateMany(
						{ ...location, slokano: source.slokano, sentno: from },
						{ $set: { slokano: label, sentno: to } },
						{ session }
					);
				}
			}

			await Shloka.deleteMany({ _id: { $in: ordered.map((shloka) => shloka._id) } }, { session });
		});

		return NextResponse.json({ shlokaId: createdId, slokano: label });
	} catch (error) {
		console.error("Cluster shloka failed:", error);
		return NextResponse.json({ error: "Failed to cluster shlokas" }, { status: 500 });
	} finally {
		await session.endSession();
	}
}
```

- [ ] **Step 2: Typecheck the route**

Run: `npx tsc --noEmit --pretty false`

Expected: no output and exit code 0. If `Shloka.create` ’s session overload errors, keep the array form shown above (`Model.create([doc], { session })`).

- [ ] **Step 3: Commit**

```bash
git add app/api/shlokas/cluster/route.ts
git commit -m "$(cat <<'EOF'
Add an API to cluster chapter shlokas without merging their sentences.

EOF
)"
```

---

### Task 3: Chapter sidebar combine control

**Files:**
- Modify: `app/(dashboard)/books/[book]/[part1]/[part2]/[chaptno]/page.tsx`

**Interfaces:**
- Consumes: `POST /api/shlokas/cluster` body `{ shlokaIds: string[] }`, header `DB-Access-Key: process.env.NEXT_PUBLIC_DBI_KEY`
- Produces: a checkbox per sidebar shloka and a Combine button when two or more are checked. On success the shloka list refetches and the selection clears.

- [ ] **Step 1: Add selection state and the combine handler**

In `app/(dashboard)/books/[book]/[part1]/[part2]/[chaptno]/page.tsx`:

Add imports:

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
```

Inside `Shlokas`, after `useParams()`:

```tsx
const queryClient = useQueryClient();
const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [isCombining, setIsCombining] = useState(false);
```

Add this function next to `handleScroll`:

```tsx
const toggleSelected = (id: string) => {
	setSelectedIds((current) =>
		current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
	);
};

const handleCombine = async () => {
	if (selectedIds.length < 2 || isCombining) return;
	const confirmed = window.confirm(
		"Combine the selected shlokas into one card? Their sentences stay separate."
	);
	if (!confirmed) return;

	setIsCombining(true);
	try {
		const response = await fetch("/api/shlokas/cluster", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
			},
			body: JSON.stringify({ shlokaIds: selectedIds }),
		});
		const data = await response.json().catch(() => ({}));
		if (!response.ok) {
			throw new Error(data.error || "Failed to cluster shlokas");
		}
		toast.success(`Combined into shloka ${data.slokano}`);
		setSelectedIds([]);
		await queryClient.invalidateQueries({
			queryKey: ["shlokas", book, part1, part2, chaptno],
		});
	} catch (error) {
		toast.error((error as Error).message);
	} finally {
		setIsCombining(false);
	}
};
```

- [ ] **Step 2: Render checkboxes and the button in the sidebar**

Replace the sidebar header block (the `flex w-full shrink-0` div that only contains the “Shlokas” label) with:

```tsx
<div className="flex w-full shrink-0 items-center justify-between gap-2 transition-colors duration-500">
	<strong className="p-1 text-lg text-gray-900 transition-colors duration-500 dark:text-gray-100">
		Shlokas
	</strong>
	{selectedIds.length >= 2 && (
		<Button
			size="sm"
			disabled={isCombining}
			onClick={handleCombine}
		>
			{isCombining ? "Combining..." : `Combine (${selectedIds.length})`}
		</Button>
	)}
</div>
```

Inside the `shlokas.map` button row, put a checkbox before the label. Stop the click from scrolling:

```tsx
<input
	type="checkbox"
	checked={selectedIds.includes(shloka._id)}
	onClick={(event) => event.stopPropagation()}
	onChange={() => toggleSelected(shloka._id)}
	aria-label={`Select shloka ${shloka.slokano}`}
	className="mr-2"
/>
```

Place that `<input>` as the first child of the existing `<Button>`, before the `<span className="font-medium">`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit --pretty false`

Expected: exit code 0.

- [ ] **Step 4: Manual check**

Run: `bun run dev`

In a chapter with at least two unlocked shlokas:

1. Check two sidebar rows. Combine appears.
2. Confirm. The two cards disappear and one card remains, titled with `first-last`, showing both verses as separate paragraphs.
3. Open that card. The analysis table still has the original words, grouped under different sentence numbers (the second shloka’s former sentence 1 is now sentence 2 when both sources had a single sentence).
4. Select a locked shloka plus another. The API toast shows `A selected shloka is locked` and the cards stay unchanged.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/books/[book]/[part1]/[part2]/[chaptno]/page.tsx"
git commit -m "$(cat <<'EOF'
Let a chapter combine selected shlokas into one cluster card.

EOF
)"
```

---

## Self-review

- Spec “one card, sentences stay separate”: Task 1 `sentnoMaps` plus Task 2 updates only `slokano` and `sentno`. `joinSparts` uses `#`, which `ChapterShlokaCards` already splits into paragraphs.
- Spec rejection rules: Task 2 checks count, location, `locked`, `-` in `slokano` (via `clusterLabel`), and an existing label.
- Publish flags and `owner`: set in the `Shloka.create` payload in Task 2.
- Bookmarks and discussions: not touched.
- Add Shloka multi-process failures: not in this plan.
- No `TBD` / `TODO` / “similar to task N” left in the steps.
- `sentnoMaps`, `clusterLabel`, `joinSparts`, and `compareSlokano` use the same names in Task 1 and Task 2.
