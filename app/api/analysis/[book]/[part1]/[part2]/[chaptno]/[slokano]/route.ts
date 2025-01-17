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
	const data = await req.json();

	await dbConnect();

	try {
		// Find and update by _id instead of anvaya_no
		const updatedRow = await Analysis.findByIdAndUpdate(
			data._id, // Use _id to find the document
			{
				$set: {
					...data, // Update all fields from the request
				},
			},
			{
				new: true,
				runValidators: true,
			}
		);

		if (!updatedRow) {
			console.error("Row not found:", data._id);
			return NextResponse.json({ message: `Row with id ${data._id} not found` }, { status: 404, headers: corsHeaders() });
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

// Add this to your existing route.ts file
export async function POST(req: Request, { params }: { params: Params }) {
	const { book, part1, part2, chaptno, slokano } = params;
	const data = await req.json();
	
	await dbConnect();
	
	try {
		const { positioning_strategy, ...rowData } = data;
		
		// Find existing rows that might need updating
		const existingRows = await Analysis.find({
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
			sentno: rowData.sentno
		}).sort({ anvaya_no: 1 });
		
		const [newMain, newSub] = rowData.anvaya_no.split('.').map(Number);
		
		// Update existing rows based on positioning strategy
		if (positioning_strategy === 'shift_within') {
			// Shift numbers within the same group
			for (const row of existingRows) {
				const [main, sub] = row.anvaya_no.split('.').map(Number);
				if (main === newMain && sub >= newSub) {
					await Analysis.findByIdAndUpdate(row._id, {
						$set: { anvaya_no: `${main}.${sub + 1}` }
					});
				}
			}
		} else if (positioning_strategy === 'new_group') {
			// Shift all following groups
			for (const row of existingRows) {
				const [main, sub] = row.anvaya_no.split('.').map(Number);
				if (main >= newMain) {
					await Analysis.findByIdAndUpdate(row._id, {
						$set: { anvaya_no: `${main + 1}.${sub}` }
					});
				}
			}
		}
		
		// Create the new row
		const newRow = await Analysis.create(rowData);
		
		return NextResponse.json({ 
			message: "Row added successfully", 
			newRow 
		}, { headers: corsHeaders() });
		
	} catch (error) {
		console.error("Error adding new row:", error);
		return NextResponse.json({ 
			message: "Internal Server Error", 
			error: (error as Error).message 
		}, { status: 500, headers: corsHeaders() });
	}
}
