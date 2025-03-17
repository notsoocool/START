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

// Update CORS headers to include POST method
function corsHeaders() {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
export async function PUT(req: NextRequest, { params }: { params: Params }) {
	const { book, part1, part2, chaptno, slokano } = params;
	const data = await req.json();
    const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

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
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
	const { book, part1, part2, chaptno, slokano } = params;
    const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

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

// Add POST handler for creating new rows
export async function POST(req: NextRequest, { params }: { params: Params }) {
	const { book, part1, part2, chaptno, slokano } = params;
	const { shiftType, ...data } = await req.json();
    const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	await dbConnect();

	try {
		// Validate required fields
		if (!data.anvaya_no || !data.word || !data.sentno) {
			return NextResponse.json({ message: "Missing required fields" }, { status: 400, headers: corsHeaders() });
		}

		const [newMain, newSub] = data.anvaya_no.split(".").map(Number);

		// Fetch existing rows before adding new row
		const existingRows = await Analysis.find({
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
			sentno: data.sentno,
		}).sort({ anvaya_no: 1 });

		// Create and save new row
		const newRow = new Analysis({
			...data,
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
			name_classification: data.name_classification || "-",
			sarvanAma: data.sarvanAma || "-",
			praYoga: data.prayoga || "-",
			samAsa: data.samAsa || "-",
			english_meaning: data.english_meaning || "-",
			sandhied_word: data.sandhied_word || "-",
			graph: data.graph || "-",
			hindi_meaning: data.hindi_meaning || "-",
		});

		const savedRow = await newRow.save();

		// Function to update relations
		const updateRelations = (relations: string, oldNumber: string, newNumber: string) => {
			if (!relations || relations === "-") return "-";
			return relations
				.split("#")
				.map((relation) => {
					const [type, number] = relation.split(",");
					if (number?.trim() === oldNumber) {
						return `${type},${newNumber}`;
					}
					return relation;
				})
				.join("#");
		};

		// Update existing rows based on shift type
		const updatePromises = existingRows.map(async (row) => {
			const [rowMain, rowSub] = row.anvaya_no.split(".").map(Number);
			let newAnvayaNo = row.anvaya_no;
			let shouldUpdate = false;

			if (shiftType === "main") {
				// Shift all subsequent main numbers up
				if (rowMain >= newMain) {
					newAnvayaNo = `${rowMain + 1}.${rowSub}`;
					shouldUpdate = true;
				}
			} else if (shiftType === "sub") {
				// Only update sub-numbers within the same main group
				if (rowMain === newMain && rowSub >= newSub) {
					newAnvayaNo = `${rowMain}.${rowSub + 1}`;
					shouldUpdate = true;
				}
			} else if (shiftType === "convert_to_sub") {
				if (rowMain === newMain) {
					// Only update sub-numbers within the same main group
					if (rowSub === 1) {
						// First row becomes sub-number 2 (after new row)
						newAnvayaNo = `${newMain}.2`;
						shouldUpdate = true;
					} else if (rowSub > 1) {
						// Subsequent rows get incremented sub-numbers
						newAnvayaNo = `${newMain}.${rowSub + 1}`;
						shouldUpdate = true;
					}
				}
				// Don't update any rows with different main numbers
			}

			if (shouldUpdate) {
				const oldAnvayaNo = row.anvaya_no;
				await Analysis.findByIdAndUpdate(
					row._id,
					{
						$set: {
							anvaya_no: newAnvayaNo,
							kaaraka_sambandha: updateRelations(row.kaaraka_sambandha, oldAnvayaNo, newAnvayaNo),
							possible_relations: updateRelations(row.possible_relations, oldAnvayaNo, newAnvayaNo),
						},
					},
					{ new: true }
				);
			}
		});

		await Promise.all(updatePromises);

		// Fetch final state of all rows
		const finalRows = await Analysis.find({
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
			sentno: data.sentno,
		}).sort({ anvaya_no: 1 });

		return NextResponse.json(
			{
				message: "Row created successfully",
				updatedRows: finalRows,
			},
			{ headers: corsHeaders() }
		);
	} catch (error) {
		console.error("Error creating new row:", error);
		return NextResponse.json({ message: "Internal Server Error", error: (error as Error).message }, { status: 500, headers: corsHeaders() });
	}
}
