import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";
import { logAnalysisEdit, logAnalysisAdd, logAnalysisDelete } from "@/lib/utils/analysisHistoryLogger";
import { logUsageHistory } from "@/lib/utils/usageHistoryLogger";

interface Params {
	book: string;
	part1: string;
	part2: string;
	chaptno: string;
	slokano: string;
}

// Update CORS headers to include all methods
function corsHeaders() {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods":
			"GET, POST, PUT, PATCH, DELETE, OPTIONS",
		"Access-Control-Allow-Headers":
			"Content-Type, Authorization, DB-Access-Key",
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
			return NextResponse.json(
				{ message: "Analysis not found" },
				{ status: 404, headers: corsHeaders() }
			);
		}

		return NextResponse.json(analysis, { headers: corsHeaders() });
	} catch (error) {
		console.error("Error fetching analysis:", error);
		return NextResponse.json(
			{ message: "Internal Server Error" },
			{ status: 500, headers: corsHeaders() }
		);
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
		// Get the original document for comparison
		const originalDoc = await Analysis.findById(data._id);
		if (!originalDoc) {
			console.error("Row not found:", data._id);
			return NextResponse.json(
				{ message: `Row with id ${data._id} not found` },
				{ status: 404, headers: corsHeaders() }
			);
		}

		// Convert meanings object to Map format if provided
		const updateData = { ...data };
		if (updateData.meanings && typeof updateData.meanings === 'object' && !(updateData.meanings instanceof Map)) {
			// Convert plain object to Map for Mongoose
			const meaningsMap = new Map(Object.entries(updateData.meanings));
			updateData.meanings = meaningsMap;
		}

		// Update the document
		const updatedDoc = await Analysis.findByIdAndUpdate(
			data._id,
			{
				$set: {
					...updateData,
				},
			},
			{
				new: true,
				runValidators: true,
			}
		);

		const oldRow = originalDoc.toObject ? originalDoc.toObject() : { ...originalDoc };
		const newRow = updatedDoc.toObject ? updatedDoc.toObject() : { ...updateData };
		const hasChanges = Object.keys(data).some(
			(k) => k !== "_id" && JSON.stringify(oldRow[k]) !== JSON.stringify(newRow[k])
		);
		if (hasChanges) {
			await logAnalysisEdit({
				location: {
					book,
					part1: part1 !== "null" ? part1 : undefined,
					part2: part2 !== "null" ? part2 : undefined,
					chaptno,
					slokano,
				},
				oldRow,
				newRow,
			});
		}

		return NextResponse.json(
			{ message: "Update successful", updatedRow: updatedDoc },
			{ headers: corsHeaders() }
		);
	} catch (error) {
		console.error("Error updating row:", error);
		return NextResponse.json(
			{
				message: "Internal Server Error",
				error: (error as Error).message,
			},
			{ status: 500, headers: corsHeaders() }
		);
	}
}

// DELETE API handler to remove a specific row by slokano, anvaya_no, and sentno
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
	const { book, part1, part2, chaptno, slokano } = params;
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	const { _id, anvaya_no, sentno } = await req.json();

	console.log("Delete request received for:", {
		book,
		part1,
		part2,
		chaptno,
		slokano,
		_id,
		anvaya_no,
		sentno,
	}); // Log incoming request parameters

	await dbConnect(); // Connect to the database

	try {
		// If _id is provided, use it for deletion (most reliable)
		if (_id) {
			console.log("Deleting by _id:", _id);
			const deletedRow = await Analysis.findByIdAndDelete(_id);
			
			if (!deletedRow) {
				console.warn("Row not found for deletion by _id:", _id);
				return NextResponse.json(
					{ message: "Row not found" },
					{ status: 404, headers: corsHeaders() }
				);
			}

			const row = deletedRow.toObject ? deletedRow.toObject() : { ...deletedRow };
			await logAnalysisDelete({
				location: {
					book,
					part1: part1 !== "null" ? part1 : undefined,
					part2: part2 !== "null" ? part2 : undefined,
					chaptno,
					slokano,
				},
				row,
			});

			console.log("Row deleted successfully by _id:", deletedRow);
			return NextResponse.json(
				{
					message: "Row deleted successfully",
					deletedRow: deletedRow,
				},
				{ headers: corsHeaders() }
			);
		}

		// Fallback: Use anvaya_no and sentno if no _id provided
		const sentnoString = String(sentno).trim();
		const anvayaNoString = String(anvaya_no).trim();

		// Construct query to find the row by all relevant fields
		const query = {
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
			anvaya_no: anvayaNoString,
			sentno: sentnoString,
		};

		console.log("Query for deletion (fallback):", query);

		// Get the row before deletion for logging
		const rowToDelete = await Analysis.findOne(query);
		if (!rowToDelete) {
			console.warn("Row not found for deletion:", query);
			return NextResponse.json(
				{ message: "Row not found" },
				{ status: 404, headers: corsHeaders() }
			);
		}

		// Delete the row - use findByIdAndDelete for absolute certainty
		const deletedRow = await Analysis.findByIdAndDelete(rowToDelete._id);

		const row = deletedRow.toObject ? deletedRow.toObject() : { ...deletedRow };
		await logAnalysisDelete({
			location: {
				book,
				part1: part1 !== "null" ? part1 : undefined,
				part2: part2 !== "null" ? part2 : undefined,
				chaptno,
				slokano,
			},
			row,
		});

		console.log("Row deleted successfully:", deletedRow); // Log the deleted row
		// Return the deleted row data to support undo functionality
		return NextResponse.json(
			{
				message: "Row deleted successfully",
				deletedRow: deletedRow,
			},
			{ headers: corsHeaders() }
		);
	} catch (error) {
		console.error("Error deleting row:", error); // Log any errors
		return NextResponse.json(
			{ message: "Internal Server Error" },
			{ status: 500, headers: corsHeaders() }
		);
	}
}

// Add POST handler for creating new rows
export async function POST(req: NextRequest, { params }: { params: Params }) {
	const { book, part1, part2, chaptno, slokano } = params;
	const { shiftType, updatedRows, ...data } = await req.json();
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	await dbConnect();

	try {
		// Validate required fields
		if (!data.anvaya_no || !data.word || !data.sentno) {
			return NextResponse.json(
				{ message: "Missing required fields" },
				{ status: 400, headers: corsHeaders() }
			);
		}

		// Convert meanings object to Map format if provided
		let meaningsMap = new Map();
		if (data.meanings && typeof data.meanings === 'object' && !(data.meanings instanceof Map)) {
			meaningsMap = new Map(Object.entries(data.meanings));
		}

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
			meanings: meaningsMap.size > 0 ? meaningsMap : undefined,
		});

		const savedRow = await newRow.save();
		const loc = {
			book,
			part1: part1 !== "null" ? part1 : undefined,
			part2: part2 !== "null" ? part2 : undefined,
			chaptno,
			slokano,
		};

		await logAnalysisAdd({
			location: loc,
			row: savedRow.toObject ? savedRow.toObject() : { ...savedRow },
		});

		if (updatedRows && Array.isArray(updatedRows)) {
			for (const row of updatedRows) {
				const existingRow = await Analysis.findById(row._id);
				if (!existingRow) continue;
				const hasChanges =
					existingRow.anvaya_no !== row.anvaya_no ||
					existingRow.kaaraka_sambandha !== row.kaaraka_sambandha ||
					existingRow.possible_relations !== row.possible_relations;
				if (!hasChanges) continue;

				const updatedRow = await Analysis.findByIdAndUpdate(
					row._id,
					{ $set: { anvaya_no: row.anvaya_no, kaaraka_sambandha: row.kaaraka_sambandha, possible_relations: row.possible_relations } },
					{ new: true }
				);
				if (updatedRow) {
					await logAnalysisEdit({
						location: loc,
						oldRow: existingRow.toObject ? existingRow.toObject() : { ...existingRow },
						newRow: updatedRow.toObject ? updatedRow.toObject() : { ...updatedRow },
					});
				}
			}
		}

		// Fetch final state of all rows
		const finalRows = await Analysis.find({
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
		}).sort({ sentno: 1, anvaya_no: 1 });

		return NextResponse.json(
			{
				message: "Row created and relations updated successfully",
				updatedRows: finalRows,
			},
			{ headers: corsHeaders() }
		);
	} catch (error) {
		console.error("Error creating new row:", error);
		return NextResponse.json(
			{
				message: "Internal Server Error",
				error: (error as Error).message,
			},
			{ status: 500, headers: corsHeaders() }
		);
	}
}

// PUT API handler to update analysis entries when shloka number changes
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
	const { book, part1, part2, chaptno, slokano } = params;
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	await dbConnect();

	try {
		const { newSlokano } = await req.json();

		// Validate new slokano
		if (!newSlokano) {
			return NextResponse.json(
				{ message: "New slokano is required" },
				{ status: 400, headers: corsHeaders() }
			);
		}

		// Get all analysis entries for the current shloka
		const query = {
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
		};

		const analysisEntries = await Analysis.find(query);
		if (!analysisEntries || analysisEntries.length === 0) {
			return NextResponse.json(
				{ message: "No analysis entries found" },
				{ status: 404, headers: corsHeaders() }
			);
		}

		await logUsageHistory("shloka_rename", {
			book,
			part1: part1 !== "null" ? part1 : undefined,
			part2: part2 !== "null" ? part2 : undefined,
			chaptno,
			oldSlokano: slokano,
			newSlokano,
			affectedCount: analysisEntries.length,
		});

		for (const entry of analysisEntries) {
			entry.slokano = newSlokano;
			await entry.save();
		}

		// Fetch updated entries
		const updatedEntries = await Analysis.find({
			...query,
			slokano: newSlokano,
		}).sort({ sentno: 1, anvaya_no: 1 });

		return NextResponse.json(
			{
				message: "Analysis entries updated successfully",
				updatedEntries,
			},
			{ headers: corsHeaders() }
		);
	} catch (error) {
		console.error("Error updating analysis entries:", error);
		return NextResponse.json(
			{
				message: "Internal Server Error",
				error: (error as Error).message,
			},
			{ status: 500, headers: corsHeaders() }
		);
	}
}
