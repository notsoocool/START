import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/connect";
import Shloka from "@/lib/db/newShlokaModel";
import Analysis from "@/lib/db/newAnalysisModel";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";
import { authorizeClusterEdit } from "@/lib/auth/authorizeClusterEdit";
import { logUsageHistory } from "@/lib/utils/usageHistoryLogger";
import { partitionSentnos, splitSpart } from "@/lib/utils/shlokaSplit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	const body = await req.json().catch(() => null);
	const shlokaId = body?.shlokaId;
	const cutAfterPartIndex = body?.cutAfterPartIndex;
	const secondSlokano =
		typeof body?.secondSlokano === "string" ? body.secondSlokano.trim() : "";
	const keepSlokano =
		typeof body?.keepSlokano === "string" && body.keepSlokano.trim()
			? body.keepSlokano.trim()
			: null;
	const cutAfterSentno =
		typeof body?.cutAfterSentno === "string" && body.cutAfterSentno.trim()
			? body.cutAfterSentno.trim()
			: null;

	if (typeof shlokaId !== "string" || !mongoose.isValidObjectId(shlokaId)) {
		return NextResponse.json({ error: "Shloka not found" }, { status: 400 });
	}
	if (!secondSlokano) {
		return NextResponse.json(
			{ error: "Second śloka number is required" },
			{ status: 400 }
		);
	}
	if (!Number.isInteger(cutAfterPartIndex)) {
		return NextResponse.json(
			{ error: "cutAfterPartIndex must be an integer" },
			{ status: 400 }
		);
	}

	await dbConnect();

	const source = await Shloka.findById(shlokaId);
	if (!source) {
		return NextResponse.json({ error: "Shloka not found" }, { status: 400 });
	}

	const authorization = await authorizeClusterEdit(source.book, req);
	if (authorization === "unauthenticated") {
		return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
	}
	if (authorization === "forbidden") {
		return NextResponse.json(
			{ error: "You do not have permission to split ślokas in this book" },
			{ status: 403 }
		);
	}

	let firstSpart: string;
	let secondSpart: string;
	try {
		({ first: firstSpart, second: secondSpart } = splitSpart(
			String(source.spart ?? ""),
			cutAfterPartIndex
		));
	} catch (error) {
		return NextResponse.json({ error: (error as Error).message }, { status: 400 });
	}

	const location = {
		book: source.book,
		part1: source.part1 ?? null,
		part2: source.part2 ?? null,
		chaptno: source.chaptno,
	};

	const originalSlokano = String(source.slokano);
	const firstSlokano = keepSlokano || originalSlokano;
	if (firstSlokano === secondSlokano) {
		return NextResponse.json(
			{ error: "First and second śloka numbers must differ" },
			{ status: 400 }
		);
	}

	const secondConflict = await Shloka.findOne({
		...location,
		slokano: secondSlokano,
		_id: { $ne: source._id },
	});
	if (secondConflict) {
		return NextResponse.json(
			{ error: `Shloka ${secondSlokano} already exists in this chapter` },
			{ status: 400 }
		);
	}

	if (firstSlokano !== originalSlokano) {
		const firstConflict = await Shloka.findOne({
			...location,
			slokano: firstSlokano,
			_id: { $ne: source._id },
		});
		if (firstConflict) {
			return NextResponse.json(
				{ error: `Shloka ${firstSlokano} already exists in this chapter` },
				{ status: 400 }
			);
		}
	}

	const analysisRows = await Analysis.find({
		...location,
		slokano: originalSlokano,
	});

	let keepSentnos: string[];
	let moveSentnos: string[];
	try {
		({ keep: keepSentnos, move: moveSentnos } = partitionSentnos(
			analysisRows.map((row) => String(row.sentno)),
			cutAfterSentno
		));
	} catch (error) {
		return NextResponse.json({ error: (error as Error).message }, { status: 400 });
	}

	if (moveSentnos.length) {
		const secondAnalysisConflict = await Analysis.findOne({
			...location,
			slokano: secondSlokano,
		});
		if (secondAnalysisConflict) {
			return NextResponse.json(
				{ error: `Analysis rows already exist for śloka ${secondSlokano}` },
				{ status: 400 }
			);
		}
	}

	const session = await mongoose.startSession();
	try {
		let createdId = "";
		await session.withTransaction(async () => {
			source.spart = firstSpart;
			source.slokano = firstSlokano;
			source.clusterUndo = undefined;
			source.clusteredAt = undefined;
			await source.save({ session });

			const created = await Shloka.create(
				[
					{
						...location,
						slokano: secondSlokano,
						spart: secondSpart,
						userPublished: source.userPublished === true,
						groupPublished: source.groupPublished === true,
						locked: source.locked === true,
						owner: source.owner ?? null,
					},
				],
				{ session }
			);
			createdId = String(created[0]._id);

			if (moveSentnos.length) {
				await Analysis.updateMany(
					{
						...location,
						slokano: originalSlokano,
						sentno: { $in: moveSentnos },
					},
					{ $set: { slokano: secondSlokano } },
					{ session }
				);
			}

			if (firstSlokano !== originalSlokano && keepSentnos.length) {
				await Analysis.updateMany(
					{
						...location,
						slokano: originalSlokano,
						sentno: { $in: keepSentnos },
					},
					{ $set: { slokano: firstSlokano } },
					{ session }
				);
			}
		});

		await logUsageHistory("shloka_split", {
			location,
			fromSlokano: originalSlokano,
			keepSlokano: firstSlokano,
			secondSlokano,
			movedSentnos: moveSentnos,
			movedAnalysisCount: analysisRows.filter((row) =>
				moveSentnos.includes(String(row.sentno))
			).length,
		});

		return NextResponse.json({
			first: { shlokaId: String(source._id), slokano: firstSlokano },
			second: { shlokaId: createdId, slokano: secondSlokano },
		});
	} catch (error) {
		console.error("Split shloka failed:", error);
		const message =
			process.env.NODE_ENV === "production"
				? "Failed to split śloka"
				: `Failed to split śloka: ${(error as Error).message}`;
		return NextResponse.json({ error: message }, { status: 500 });
	} finally {
		await session.endSession();
	}
}
