import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";
import { logAnalysisDelete } from "@/lib/utils/analysisHistoryLogger";

interface Params {
	book: string;
	part1: string;
	part2: string;
	chaptno: string;
	slokano: string;
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
	const { book, part1, part2, chaptno, slokano } = params;
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	await dbConnect();

	try {
		// Get the request body to check if this is part of a complete deletion
		const body = await req.json().catch(() => ({}));
		const isCompleteDeletion = body.isCompleteDeletion === true;

		const query = {
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
		};

		const analysesToDelete = await Analysis.find(query);
		if (analysesToDelete.length === 0) {
			return NextResponse.json({ error: "No analysis found to delete" }, { status: 404 });
		}

		const result = await Analysis.deleteMany(query);

		if (!isCompleteDeletion) {
			const loc = {
				book,
				part1: part1 !== "null" ? part1 : undefined,
				part2: part2 !== "null" ? part2 : undefined,
				chaptno,
				slokano,
			};
			for (const a of analysesToDelete) {
				const row = a.toObject ? a.toObject() : { ...a };
				await logAnalysisDelete({ location: loc, row });
			}
		}

		return NextResponse.json({
			message: `Deleted ${result.deletedCount} analysis entries successfully.`,
			deletedCount: result.deletedCount,
		});
	} catch (error) {
		console.error("Error deleting analysis entries:", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
