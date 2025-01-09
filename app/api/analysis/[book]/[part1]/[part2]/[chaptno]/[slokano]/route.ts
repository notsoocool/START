import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";

interface Params {
	book: string;
	part1: string;
	part2: string;
	chaptno: string;
	slokano: string;
}

// Add CORS headers helper function
function corsHeaders() {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	};
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
	return NextResponse.json({}, { headers: corsHeaders() });
}

export async function GET(req: Request, { params }: { params: Params }) {
	const { book, part1, part2, chaptno, slokano } = params;

	await dbConnect(); // Connect to the database

	try {
		// Log the parameters and query
		console.log("Params received:", params);

		const query = {
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
		};

		let analysis = await Analysis.find(query).sort({ sentno: 1 });

		// If analysis data exists, apply custom sorting to `anvaya_no`
		if (analysis && analysis.length > 0) {
			analysis = analysis.sort((a, b) => {
				// First, sort by sentno
				if (a.sentno !== b.sentno) {
					return a.sentno - b.sentno;
				}

				// If sentno is the same, then sort by anvaya_no
				const [aMain, aSub] = a.anvaya_no.split(".").map(Number);
				const [bMain, bSub] = b.anvaya_no.split(".").map(Number);

				if (aMain !== bMain) {
					return aMain - bMain;
				}

				return aSub - bSub;
			});
		} else {
			console.log("No matching analysis found");
			return NextResponse.json({ message: "Analysis not found" }, { status: 404, headers: corsHeaders() });
		}

		return NextResponse.json(analysis, { headers: corsHeaders() });
	} catch (error) {
		console.error("Error fetching analysis:", error);
		return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders() });
	}
}

// PUT API handler to update specific row by anvaya_no and sentno
export async function PUT(req: Request, { params }: { params: Params }) {
	const { book, part1, part2, chaptno, slokano } = params;
	const {
		original_anvaya_no, // Original anvaya_no to find the record
		new_anvaya_no, // New anvaya_no to update to
		sentno,
		...updateData
	} = await req.json();

	await dbConnect();

	try {
		console.log("Updating row:", {
			original_anvaya_no,
			new_anvaya_no,
			sentno,
			updateData,
		});

		// Construct query to find the row using original anvaya_no
		const query = {
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
			anvaya_no: original_anvaya_no,
			sentno,
		};

		// Update the matching row with new anvaya_no and other data
		const updatedRow = await Analysis.findOneAndUpdate(
			query,
			{
				$set: {
					...updateData,
					anvaya_no: new_anvaya_no, // Update to new anvaya_no
				},
			},
			{
				new: true,
				runValidators: true,
			}
		);

		if (!updatedRow) {
			console.error("Row not found:", query);
			return NextResponse.json({ message: `Row with anvaya_no ${original_anvaya_no} not found` }, { status: 404, headers: corsHeaders() });
		}

		console.log("Row updated successfully:", updatedRow);
		return NextResponse.json({ message: "Update successful", updatedRow }, { headers: corsHeaders() });
	} catch (error) {
		console.error("Error updating row:", error);
		return NextResponse.json({ message: "Internal Server Error", error: (error as Error).message }, { status: 500, headers: corsHeaders() });
	}
}

// DELETE API handler to remove a specific row by slokano, anvaya_no, and sentno
export async function DELETE(req: Request, { params }: { params: Params }) {
	const { book, part1, part2, chaptno, slokano } = params;

	// Extract anvaya_no and sentno from the request body
	const { anvaya_no, sentno } = await req.json();

	console.log("Delete request received for:", { book, part1, part2, chaptno, slokano, anvaya_no, sentno }); // Log incoming request parameters

	await dbConnect(); // Connect to the database

	try {
		// Construct query to find the row by all relevant fields
		const query = {
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
			anvaya_no,
			sentno,
		};

		console.log("Query for deletion:", query); // Log the query being executed

		// Delete the matching row
		const deletedRow = await Analysis.findOneAndDelete(query);

		if (!deletedRow) {
			console.warn("Row not found for deletion:", query); // Log if no row was found
			return NextResponse.json({ message: "Row not found" }, { status: 404, headers: corsHeaders() });
		}

		console.log("Row deleted successfully:", deletedRow); // Log the deleted row
		return NextResponse.json({ message: "Row deleted successfully" }, { headers: corsHeaders() });
	} catch (error) {
		console.error("Error deleting row:", error); // Log any errors
		return NextResponse.json({ message: "Internal Server Error" }, { status: 500, headers: corsHeaders() });
	}
}
