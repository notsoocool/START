import { NextResponse } from "next/server";
import AHShloka from "@/lib/db/newShlokaModel";
import dbConnect from "@/lib/db/connect";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";
import { logHistory } from "@/lib/utils/historyLogger";
import Analysis from "@/lib/db/newAnalysisModel";

// Handler for GET requests (fetching snippet by ID)
export async function GET(req: Request, { params }: { params: { id: string } }) {
	try {
		// Connect to the database
		await dbConnect();

		const { id } = params; // Extract the snippet ID from the request params

		// Check if the ID is a valid MongoDB ObjectId
		if (!ObjectId.isValid(id)) {
			return NextResponse.json({ error: "Invalid Shloka ID" }, { status: 400 });
		}

		// Find the snippet by ID in the database
		const shloka = await AHShloka.findById(id);

		// If snippet not found, return a 404 error
		if (!shloka) {
			return NextResponse.json({ error: "Shloka not found" }, { status: 404 });
		}

		// Return the snippet as JSON
		return NextResponse.json(shloka, { status: 200 });
	} catch (error) {
		console.error("Error fetching shloka:", error);
		return NextResponse.json({ error: "Error fetching shloka" }, { status: 500 });
	}
}

interface Params {
	id: string;
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
	const { id } = params;
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	await dbConnect();

	try {
		// Get the request body to check if this is part of a complete deletion
		const body = await req.json().catch(() => ({}));
		const isCompleteDeletion = body.isCompleteDeletion === true;

		// Find the shloka before deletion to get its details
		const shlokaToDelete = await AHShloka.findById(id);
		if (!shlokaToDelete) {
			return NextResponse.json({ error: "Shloka not found" }, { status: 404 });
		}

		let associatedAnalyses = [];
		if (isCompleteDeletion) {
			// Get all associated analyses before deletion
			associatedAnalyses = await Analysis.find({
				book: shlokaToDelete.book,
				part1: shlokaToDelete.part1,
				part2: shlokaToDelete.part2,
				chaptno: shlokaToDelete.chaptno,
				slokano: shlokaToDelete.slokano,
			}).select("anvaya_no word sentno morph_analysis english_meaning hindi_meaning");
		}

		// Delete the shloka
		const deletedShloka = await AHShloka.findByIdAndDelete(id);

		// Log the shloka deletion with analysis information if it's a complete deletion
		await logHistory({
			action: isCompleteDeletion ? "complete_delete" : "delete",
			modelType: "Shloka",
			details: {
				book: deletedShloka.book,
				part1: deletedShloka.part1 || undefined,
				part2: deletedShloka.part2 || undefined,
				chaptno: deletedShloka.chaptno,
				slokano: deletedShloka.slokano,
				isCompleteDeletion,
				changes: [
					{
						field: isCompleteDeletion ? "complete_deletion_shloka" : "deleted_shloka",
						oldValue: {
							slokano: deletedShloka.slokano,
							spart: deletedShloka.spart,
							status: {
								locked: deletedShloka.locked,
								userPublished: deletedShloka.userPublished,
								groupPublished: deletedShloka.groupPublished,
							},
							// Include associated analyses in the oldValue when it's a complete deletion
							...(isCompleteDeletion && {
								deletedAnalyses: associatedAnalyses.map((analysis) => ({
									anvaya_no: analysis.anvaya_no,
									word: analysis.word,
									sentno: analysis.sentno,
									morph_analysis: analysis.morph_analysis,
									english_meaning: analysis.english_meaning,
									hindi_meaning: analysis.hindi_meaning,
								})),
							}),
						},
						newValue: null,
					},
				],
			},
		});

		return NextResponse.json({
			message: "Shloka deleted successfully",
			deletedShloka,
		});
	} catch (error) {
		console.error("Error deleting shloka:", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
