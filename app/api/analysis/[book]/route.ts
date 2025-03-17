import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";

export async function DELETE(req: NextRequest, { params }: { params: { book: string } }) {
	const { book } = params;
    const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}


	await dbConnect(); // Connect to the database

	try {
		// Construct the query to delete all analyses for the specified book
		const query = { book };

		// Execute the delete operation
		const result = await Analysis.deleteMany(query);

		return NextResponse.json({
			message: `Deleted ${result.deletedCount} entries successfully for book: ${book}.`,
		});
	} catch (error) {
		console.error("Error deleting entries:", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
