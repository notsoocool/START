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

// CORS headers
function corsHeaders() {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods":
			"GET, POST, PUT, DELETE, PATCH, OPTIONS",
		"Access-Control-Allow-Headers":
			"Content-Type, Authorization, DB-Access-Key",
	};
}

export async function OPTIONS() {
	return NextResponse.json({}, { headers: corsHeaders() });
}

// POST handler for restoring deleted rows (undo functionality)
export async function POST(req: NextRequest, { params }: { params: Params }) {
	const { book, part1, part2, chaptno, slokano } = params;
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	const { deletedRow } = await req.json();

	console.log("Restore request received for:", {
		book,
		part1,
		part2,
		chaptno,
		slokano,
		deletedRow,
	}); // Log incoming request parameters

	await dbConnect(); // Connect to the database

	try {
		// Validate required fields
		if (!deletedRow || !deletedRow.anvaya_no || !deletedRow.sentno) {
			return NextResponse.json(
				{ message: "Missing required fields" },
				{ status: 400, headers: corsHeaders() }
			);
		}

		// Create a new row with the deleted row's data (excluding _id to create a new one)
		const { _id, __v, ...rowData } = deletedRow;

		const restoredRow = new Analysis({
			...rowData,
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
		});

		const savedRow = await restoredRow.save();

		// Log the restoration
		await logHistory({
			action: "restore",
			modelType: "Analysis",
			details: {
				book,
				part1: part1 !== "null" ? part1 : undefined,
				part2: part2 !== "null" ? part2 : undefined,
				chaptno,
				slokano,
				changes: [
					{
						field: "restored_analysis",
						oldValue: null,
						newValue: {
							anvaya_no: savedRow.anvaya_no,
							word: savedRow.word,
							sentno: savedRow.sentno,
						},
					},
				],
			},
		});

		console.log("Row restored successfully:", savedRow); // Log the restored row
		return NextResponse.json(
			{
				message: "Row restored successfully",
				restoredRow: savedRow,
			},
			{ headers: corsHeaders() }
		);
	} catch (error) {
		console.error("Error restoring row:", error); // Log any errors
		return NextResponse.json(
			{ message: "Internal Server Error" },
			{ status: 500, headers: corsHeaders() }
		);
	}
}

