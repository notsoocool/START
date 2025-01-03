import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";

export async function DELETE(req: Request, { params }: { params: { book: string } }) {
	const { book } = params;

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
