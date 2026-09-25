import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db/connect";
import Shloka from "@/lib/db/newShlokaModel";
import Analysis from "@/lib/db/newAnalysisModel";
import Perms from "@/lib/db/permissionsModel";
import Group from "@/lib/db/groupModel";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";
import { logUsageHistory } from "@/lib/utils/usageHistoryLogger";
import {
	clusterLabel,
	compareSlokano,
	joinSparts,
	leadingSlokano,
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

/**
 * Mirrors the Editor/Annotator group-membership rule used for shloka editing
 * (see app/(dashboard)/books/[book]/[part1]/[part2]/[chaptno]/[id]/page.tsx):
 * Root/Admin may always edit; Editor/Annotator may only edit if they belong
 * to a group that has this book assigned.
 */
async function authorizeClusterEdit(
	book: string
): Promise<"unauthenticated" | "forbidden" | "ok"> {
	const user = await currentUser();
	if (!user) return "unauthenticated";

	const userPerms = await Perms.findOne({ userID: user.id });
	const role = userPerms?.perms;

	if (role === "Root" || role === "Admin") return "ok";

	if (role === "Editor" || role === "Annotator") {
		const group = await Group.findOne({ members: user.id, assignedBooks: book });
		if (group) return "ok";
	}

	return "forbidden";
}

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
	if (shlokaIds.some((id) => !mongoose.isValidObjectId(id))) {
		return NextResponse.json({ error: "One or more shlokas were not found" }, { status: 400 });
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

	// Role check: the DBI key (checked above) is public. Only Root, Admin, or
	// an Editor/Annotator assigned to this book's group may actually combine.
	const authorization = await authorizeClusterEdit(anchor.book);
	if (authorization === "unauthenticated") {
		return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
	}
	if (authorization === "forbidden") {
		return NextResponse.json(
			{ error: "You do not have permission to combine shlokas in this book" },
			{ status: 403 }
		);
	}

	if (shlokas.some((shloka) => shloka.locked)) {
		return NextResponse.json({ error: "A selected shloka is locked" }, { status: 400 });
	}

	const slokanoValues = shlokas.map((shloka) => String(shloka.slokano));
	if (new Set(slokanoValues).size !== slokanoValues.length) {
		return NextResponse.json({ error: "Duplicate shloka selected" }, { status: 400 });
	}

	let label: string;
	try {
		label = clusterLabel(slokanoValues);
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

	// Contiguity check: the label is a real range (e.g. "051-055"), so every
	// shloka in the chapter whose leading number falls inside that range must
	// be part of the selection. Otherwise 052-054 would silently vanish into
	// sentence 1 of the new "051-055" shloka.
	const selectionNums = slokanoValues.map((value) => leadingSlokano(value));
	if (selectionNums.some((n) => n === null)) {
		return NextResponse.json(
			{ error: "Selected shlokas must have a numeric shloka number" },
			{ status: 400 }
		);
	}
	const numericSelectionNums = selectionNums as number[];
	const minNum = Math.min(...numericSelectionNums);
	const maxNum = Math.max(...numericSelectionNums);

	const chapterShlokas = await Shloka.find(location).select("_id slokano");
	const selectedIdSet = new Set(shlokas.map((shloka) => String(shloka._id)));
	const gaps = chapterShlokas.filter((shloka) => {
		if (selectedIdSet.has(String(shloka._id))) return false;
		const n = leadingSlokano(String(shloka.slokano));
		return n !== null && n >= minNum && n <= maxNum;
	});
	if (gaps.length > 0) {
		return NextResponse.json(
			{
				error: `Selection is not contiguous; shloka(s) ${gaps
					.map((shloka) => shloka.slokano)
					.join(", ")} fall inside the range but were not selected`,
			},
			{ status: 400 }
		);
	}

	const existingShloka = await Shloka.findOne({ ...location, slokano: label });
	if (existingShloka) {
		return NextResponse.json({ error: `Shloka ${label} already exists in this chapter` }, { status: 400 });
	}

	// Also reject if Analysis rows already exist under the new label, even if
	// no Shloka document does — otherwise unrelated rows could be merged in.
	const existingAnalysis = await Analysis.findOne({ ...location, slokano: label });
	if (existingAnalysis) {
		return NextResponse.json(
			{ error: `Analysis rows already exist for shloka ${label} in this chapter` },
			{ status: 400 }
		);
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
				const expectedCount = analysesBySource[i].length;
				let movedCount = 0;
				for (const [from, to] of Array.from(map.entries())) {
					const result = await Analysis.updateMany(
						{ ...location, slokano: source.slokano, sentno: from },
						{ $set: { slokano: label, sentno: to } },
						{ session }
					);
					movedCount += result.modifiedCount;
				}
				if (movedCount !== expectedCount) {
					throw new Error(
						`Expected to move ${expectedCount} analysis row(s) for shloka ${source.slokano}, but moved ${movedCount}`
					);
				}
			}

			await Shloka.deleteMany({ _id: { $in: ordered.map((shloka) => shloka._id) } }, { session });
		});

		await logUsageHistory("shloka_cluster", {
			location,
			sourceSlokanos: ordered.map((shloka) => String(shloka.slokano)),
			newSlokano: label,
			movedAnalysisCount: analysesBySource.reduce((sum, rows) => sum + rows.length, 0),
		});

		return NextResponse.json({ shlokaId: createdId, slokano: label });
	} catch (error) {
		console.error("Cluster shloka failed:", error);
		const message =
			process.env.NODE_ENV === "production"
				? "Failed to cluster shlokas"
				: `Failed to cluster shlokas: ${(error as Error).message}`;
		return NextResponse.json({ error: message }, { status: 500 });
	} finally {
		await session.endSession();
	}
}
