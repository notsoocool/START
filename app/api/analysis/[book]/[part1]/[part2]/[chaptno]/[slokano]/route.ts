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

// Update CORS headers to include all methods
function corsHeaders() {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization, DB-Access-Key",
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
		// Get the original document for comparison
		const originalDoc = await Analysis.findById(data._id);
		if (!originalDoc) {
			console.error("Row not found:", data._id);
			return NextResponse.json({ message: `Row with id ${data._id} not found` }, { status: 404, headers: corsHeaders() });
		}

		// Update the document
		const updatedDoc = await Analysis.findByIdAndUpdate(
			data._id,
			{
				$set: {
					...data,
				},
			},
			{
				new: true,
				runValidators: true,
			}
		);

		// Compare and log changes
		const changes = Object.entries(data)
			.filter(([key, value]) => key !== "_id" && JSON.stringify(originalDoc[key]) !== JSON.stringify(value))
			.map(([field, newValue]) => ({
				field,
				oldValue: originalDoc[field],
				newValue,
			}));

		if (changes.length > 0) {
			await logHistory({
				action: "edit",
				modelType: "Analysis",
				details: {
					book,
					part1: part1 !== "null" ? part1 : undefined,
					part2: part2 !== "null" ? part2 : undefined,
					chaptno,
					slokano,
					changes,
				},
			});
		}

		return NextResponse.json({ message: "Update successful", updatedRow: updatedDoc }, { headers: corsHeaders() });
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

		// Get the row before deletion for logging
		const rowToDelete = await Analysis.findOne(query);
		if (!rowToDelete) {
			console.warn("Row not found for deletion:", query); // Log if no row was found
			return NextResponse.json({ message: "Row not found" }, { status: 404, headers: corsHeaders() });
		}

		// Delete the row
		const deletedRow = await Analysis.findOneAndDelete(query);

		// Log the deletion
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
							anvaya_no: deletedRow.anvaya_no,
							word: deletedRow.word,
							sentno: deletedRow.sentno,
						},
						newValue: null,
					},
				],
			},
		});

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

		// Track all changes for history logging
		const allChanges: {
			field: string;
			oldValue: null | {
				anvaya_no: string;
				word: string;
				sentno: string;
				poem?: string;
				morph_analysis?: string;
				morph_in_context?: string;
				kaaraka_sambandha?: string;
				possible_relations?: string;
				bgcolor?: string;
				name_classification?: string;
				sarvanAma?: string;
				prayoga?: string;
				samAsa?: string;
				english_meaning?: string;
				sandhied_word?: string;
				hindi_meaning?: string;
			};
			newValue: null | {
				anvaya_no: string;
				word: string;
				sentno: string;
				poem?: string;
				morph_analysis?: string;
				morph_in_context?: string;
				kaaraka_sambandha?: string;
				possible_relations?: string;
				bgcolor?: string;
				name_classification?: string;
				sarvanAma?: string;
				prayoga?: string;
				samAsa?: string;
				english_meaning?: string;
				sandhied_word?: string;
				hindi_meaning?: string;
			};
		}[] = [
			{
				field: "new_analysis",
				oldValue: null,
				newValue: {
					anvaya_no: savedRow.anvaya_no,
					word: savedRow.word,
					sentno: savedRow.sentno,
					poem: savedRow.poem,
					morph_analysis: savedRow.morph_analysis,
					morph_in_context: savedRow.morph_in_context,
					kaaraka_sambandha: savedRow.kaaraka_sambandha,
					possible_relations: savedRow.possible_relations,
					bgcolor: savedRow.bgcolor,
					name_classification: savedRow.name_classification,
					sarvanAma: savedRow.sarvanAma,
					prayoga: savedRow.prayoga,
					samAsa: savedRow.samAsa,
					english_meaning: savedRow.english_meaning,
					sandhied_word: savedRow.sandhied_word,
					hindi_meaning: savedRow.hindi_meaning,
				},
			},
		];

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
			}

			if (shouldUpdate) {
				const oldAnvayaNo = row.anvaya_no;
				const updatedRow = await Analysis.findByIdAndUpdate(
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

				// Add the anvaya number change to the changes array with all row data
				allChanges.push({
					field: "anvaya_no_update",
					oldValue: {
						anvaya_no: oldAnvayaNo,
						word: row.word,
						sentno: row.sentno,
						poem: row.poem,
						morph_analysis: row.morph_analysis,
						morph_in_context: row.morph_in_context,
						kaaraka_sambandha: row.kaaraka_sambandha,
						possible_relations: row.possible_relations,
						bgcolor: row.bgcolor,
						name_classification: row.name_classification,
						sarvanAma: row.sarvanAma,
						prayoga: row.prayoga,
						samAsa: row.samAsa,
						english_meaning: row.english_meaning,
						sandhied_word: row.sandhied_word,
						hindi_meaning: row.hindi_meaning,
					},
					newValue: {
						anvaya_no: newAnvayaNo,
						word: updatedRow.word,
						sentno: updatedRow.sentno,
						poem: updatedRow.poem,
						morph_analysis: updatedRow.morph_analysis,
						morph_in_context: updatedRow.morph_in_context,
						kaaraka_sambandha: updatedRow.kaaraka_sambandha,
						possible_relations: updatedRow.possible_relations,
						bgcolor: updatedRow.bgcolor,
						name_classification: updatedRow.name_classification,
						sarvanAma: updatedRow.sarvanAma,
						prayoga: updatedRow.prayoga,
						samAsa: updatedRow.samAsa,
						english_meaning: updatedRow.english_meaning,
						sandhied_word: updatedRow.sandhied_word,
						hindi_meaning: updatedRow.hindi_meaning,
					},
				});
			}
		});

		await Promise.all(updatePromises);

		// Log all changes in a single history entry
		await logHistory({
			action: "create",
			modelType: "Analysis",
			details: {
				book,
				part1: part1 !== "null" ? part1 : undefined,
				part2: part2 !== "null" ? part2 : undefined,
				chaptno,
				slokano,
				changes: allChanges,
			},
		});

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
			return NextResponse.json({ message: "New slokano is required" }, { status: 400, headers: corsHeaders() });
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
			return NextResponse.json({ message: "No analysis entries found" }, { status: 404, headers: corsHeaders() });
		}

		// Update all entries with the new slokano
		const updatePromises = analysisEntries.map(async (entry) => {
			const originalEntry = { ...entry.toObject() };
			entry.slokano = newSlokano;
			await entry.save();

			// Log the change
			await logHistory({
				action: "edit",
				modelType: "Analysis",
				details: {
					book,
					part1: part1 !== "null" ? part1 : undefined,
					part2: part2 !== "null" ? part2 : undefined,
					chaptno,
					slokano: originalEntry.slokano,
					changes: [
						{
							field: "slokano",
							oldValue: originalEntry.slokano,
							newValue: newSlokano,
						},
					],
				},
			});
		});

		await Promise.all(updatePromises);

		// Fetch updated entries
		const updatedEntries = await Analysis.find({
			...query,
			slokano: newSlokano,
		}).sort({ sentno: 1, anvaya_no: 1 });

		return NextResponse.json({ message: "Analysis entries updated successfully", updatedEntries }, { headers: corsHeaders() });
	} catch (error) {
		console.error("Error updating analysis entries:", error);
		return NextResponse.json({ message: "Internal Server Error", error: (error as Error).message }, { status: 500, headers: corsHeaders() });
	}
}
