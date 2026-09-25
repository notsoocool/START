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
				for (const [from, to] of Array.from(map.entries())) {
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
