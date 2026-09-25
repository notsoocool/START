import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/connect";
import Shloka from "@/lib/db/newShlokaModel";
import Analysis from "@/lib/db/newAnalysisModel";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";
import { authorizeClusterEdit } from "@/lib/auth/authorizeClusterEdit";
import { logUsageHistory } from "@/lib/utils/usageHistoryLogger";
import { isClusterUndoOpen } from "@/lib/utils/shlokaCluster";

export const dynamic = "force-dynamic";

type SentnoMove = { from: string; to: string; rows: number };

type ClusterSourceSnapshot = {
	slokano: string;
	spart: string;
	userPublished?: boolean;
	groupPublished?: boolean;
	locked?: boolean;
	owner?: string | null;
	sentnoMap?: SentnoMove[];
};

export async function POST(req: NextRequest) {
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	const body = await req.json().catch(() => null);
	const shlokaId = body?.shlokaId;
	if (typeof shlokaId !== "string" || !mongoose.isValidObjectId(shlokaId)) {
		return NextResponse.json({ error: "Shloka not found" }, { status: 400 });
	}

	await dbConnect();

	const cluster = await Shloka.findById(shlokaId);
	if (!cluster) {
		return NextResponse.json({ error: "Shloka not found" }, { status: 400 });
	}

	const authorization = await authorizeClusterEdit(cluster.book);
	if (authorization === "unauthenticated") {
		return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
	}
	if (authorization === "forbidden") {
		return NextResponse.json(
			{ error: "You do not have permission to undo a cluster in this book" },
			{ status: 403 }
		);
	}

	const snapshots: ClusterSourceSnapshot[] = Array.isArray(cluster.clusterUndo)
		? cluster.clusterUndo.map((item: { toObject?: () => ClusterSourceSnapshot }) =>
				typeof item.toObject === "function" ? item.toObject() : (item as ClusterSourceSnapshot)
			)
		: [];

	if (snapshots.length < 2) {
		return NextResponse.json(
			{ error: "This shloka was not combined here, so it cannot be undone" },
			{ status: 400 }
		);
	}

	if (!isClusterUndoOpen(cluster.clusteredAt)) {
		return NextResponse.json(
			{ error: "Undo combine is only available for 24 hours after combining" },
			{ status: 400 }
		);
	}

	const location = {
		book: cluster.book,
		part1: cluster.part1 ?? null,
		part2: cluster.part2 ?? null,
		chaptno: cluster.chaptno,
	};

	const existing = await Shloka.findOne({
		...location,
		slokano: { $in: snapshots.map((source) => source.slokano) },
	});
	if (existing) {
		return NextResponse.json(
			{ error: `Shloka ${existing.slokano} already exists in this chapter` },
			{ status: 400 }
		);
	}

	const expectedRows = snapshots.reduce(
		(sum, source) => sum + (source.sentnoMap ?? []).reduce((rows, move) => rows + move.rows, 0),
		0
	);
	const actualRows = await Analysis.countDocuments({ ...location, slokano: cluster.slokano });
	if (actualRows !== expectedRows) {
		return NextResponse.json(
			{ error: "This cluster has changed since it was combined, so it cannot be undone" },
			{ status: 400 }
		);
	}

	const session = await mongoose.startSession();
	try {
		await session.withTransaction(async () => {
			for (const source of snapshots) {
				for (const move of source.sentnoMap ?? []) {
					if (move.rows === 0) continue;
					const result = await Analysis.updateMany(
						{ ...location, slokano: cluster.slokano, sentno: move.to },
						{ $set: { slokano: source.slokano, sentno: move.from } },
						{ session }
					);
					if (result.modifiedCount !== move.rows) {
						throw new Error(
							`Expected to restore ${move.rows} row(s) for shloka ${source.slokano}, but restored ${result.modifiedCount}`
						);
					}
				}
			}

			await Shloka.create(
				snapshots.map((source) => ({
					...location,
					slokano: source.slokano,
					spart: source.spart,
					userPublished: source.userPublished === true,
					groupPublished: source.groupPublished === true,
					locked: source.locked === true,
					owner: source.owner ?? null,
				})),
				{ session }
			);

			await Shloka.deleteOne({ _id: cluster._id }, { session });
		});

		await logUsageHistory("shloka_uncluster", {
			location,
			slokano: cluster.slokano,
			restoredSlokanos: snapshots.map((source) => source.slokano),
		});

		return NextResponse.json({
			slokanos: snapshots.map((source) => source.slokano),
		});
	} catch (error) {
		console.error("Undo cluster failed:", error);
		const message =
			process.env.NODE_ENV === "production"
				? "Failed to undo cluster"
				: `Failed to undo cluster: ${(error as Error).message}`;
		return NextResponse.json({ error: message }, { status: 500 });
	} finally {
		await session.endSession();
	}
}
