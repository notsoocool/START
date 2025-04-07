import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";

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
		// Construct the query to match the exact shloka
		const query = {
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
		};

		// Execute the delete operation
		const result = await Analysis.deleteMany(query);

		if (result.deletedCount === 0) {
			return NextResponse.json({ error: "No analysis found to delete" }, { status: 404 });
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
