import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";
import { logHistory } from "@/lib/utils/historyLogger";

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

		// Only log if this is not part of a complete deletion
		if (!isCompleteDeletion) {
			// Get all analysis entries before deletion for logging
			const analysesToDelete = await Analysis.find(query);

			// Log the deletion of each analysis entry
			for (const analysis of analysesToDelete) {
				await logHistory({
					action: "delete",
					modelType: "Analysis",
					details: {
						book,
						part1: part1 !== "null" ? part1 : undefined,
						part2: part2 !== "null" ? part2 : undefined,
						chaptno,
						slokano,
						changes: [
							{
								field: "deleted_analysis",
								oldValue: {
									_id: analysis._id,
									chaptno: analysis.chaptno,
									slokano: analysis.slokano,
									sentno: analysis.sentno,
									bgcolor: analysis.bgcolor,
									graph: analysis.graph,
									anvaya_no: analysis.anvaya_no,
									word: analysis.word,
									poem: analysis.poem,
									sandhied_word: analysis.sandhied_word,
									morph_analysis: analysis.morph_analysis,
									morph_in_context: analysis.morph_in_context,
									kaaraka_sambandha: analysis.kaaraka_sambandha,
									possible_relations: analysis.possible_relations,
									hindi_meaning: analysis.hindi_meaning,
									english_meaning: analysis.english_meaning,
									samAsa: analysis.samAsa,
									prayoga: analysis.prayoga,
									sarvanAma: analysis.sarvanAma,
									name_classification: analysis.name_classification,
									book: analysis.book,
									part1: analysis.part1,
									part2: analysis.part2,
								},
								newValue: null,
							},
						],
					},
				});
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
