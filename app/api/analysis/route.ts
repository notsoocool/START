import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import { logHistory } from "@/lib/utils/historyLogger";

// Helper function to handle CORS
const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
	return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
	await dbConnect();

	try {
		const data = await req.json();

		// If data is an array, handle multiple entries
		if (Array.isArray(data)) {
			// Ensure all required fields are present with defaults
			const formattedData = data.map((item) => ({
				chaptno: item.chaptno,
				slokano: item.slokano,
				sentno: item.sentno || "1",
				bgcolor: item.bgcolor || "transparent",
				graph: item.graph || "-",
				anvaya_no: item.anvaya_no || "-",
				word: item.word || "-",
				poem: item.poem || "-",
				sandhied_word: item.sandhied_word || "-",
				morph_analysis: item.morph_analysis || "-",
				morph_in_context: item.morph_in_context || "-",
				kaaraka_sambandha: item.kaaraka_sambandha || "-",
				possible_relations: item.possible_relations || "-",
				hindi_meaning: item.hindi_meaning || "-",
				english_meaning: item.english_meaning || "-",
				samAsa: item.samAsa || "-",
				prayoga: item.prayoga || "-",
				sarvanAma: item.sarvanAma || "-",
				name_classification: item.name_classification || "-",
				book: item.book,
				part1: item.part1 || null,
				part2: item.part2 || null,
			}));

			const result = await Analysis.insertMany(formattedData);

			// Log the bulk creation
			for (const item of result) {
				await logHistory({
					action: "create",
					modelType: "Analysis",
					details: {
						book: item.book,
						part1: item.part1 || undefined,
						part2: item.part2 || undefined,
						chaptno: item.chaptno,
						slokano: item.slokano,
						changes: [
							{
								field: "new_analysis",
								oldValue: null,
								newValue: {
									anvaya_no: item.anvaya_no,
									word: item.word,
									sentno: item.sentno,
								},
							},
						],
					},
				});
			}

			return NextResponse.json({ success: true, data: result }, { headers: corsHeaders });
		} else {
			// Handle single entry
			const formattedData = {
				...data,
				sentno: data.sentno || "1",
				bgcolor: data.bgcolor || "transparent",
				graph: data.graph || "-",
				anvaya_no: data.anvaya_no || "-",
				word: data.word || "-",
				poem: data.poem || "-",
				sandhied_word: data.sandhied_word || "-",
				morph_analysis: data.morph_analysis || "-",
				morph_in_context: data.morph_in_context || "-",
				kaaraka_sambandha: data.kaaraka_sambandha || "-",
				possible_relations: data.possible_relations || "-",
				hindi_meaning: data.hindi_meaning || "-",
				english_meaning: data.english_meaning || "-",
				samAsa: data.samAsa || "-",
				prayoga: data.prayoga || "-",
				sarvanAma: data.sarvanAma || "-",
				name_classification: data.name_classification || "-",
				part1: data.part1 || null,
				part2: data.part2 || null,
			};

			const result = await Analysis.create(formattedData);

			// Log the single creation
			await logHistory({
				action: "create",
				modelType: "Analysis",
				details: {
					book: result.book,
					part1: result.part1 || undefined,
					part2: result.part2 || undefined,
					chaptno: result.chaptno,
					slokano: result.slokano,
					changes: [
						{
							field: "new_analysis",
							oldValue: null,
							newValue: {
								anvaya_no: result.anvaya_no,
								word: result.word,
								sentno: result.sentno,
							},
						},
					],
				},
			});

			return NextResponse.json({ success: true, data: result }, { headers: corsHeaders });
		}
	} catch (error) {
		console.error("Error creating analysis:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Error creating analysis",
				error: (error as Error).message,
			},
			{ status: 500, headers: corsHeaders }
		);
	}
}
