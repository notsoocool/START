import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";

interface Params {
	book: string;
	part1: string;
	part2: string;
	chaptno: string;
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
	const { book, part1, part2, chaptno } = params;
    const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	await dbConnect(); // Connect to the database

	try {
		// Construct the query
		const query = {
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
		};

		// Execute the delete operation
		const result = await Analysis.deleteMany(query);

		return NextResponse.json({
			message: `Deleted ${result.deletedCount} entries successfully.`,
		});
	} catch (error) {
		console.error("Error deleting entries:", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
