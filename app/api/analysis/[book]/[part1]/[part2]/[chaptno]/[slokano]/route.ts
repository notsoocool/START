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
			return NextResponse.json({ message: "Analysis not found" }, { status: 404 });
		}

		return NextResponse.json(analysis);
	} catch (error) {
		console.error("Error fetching analysis:", error);
		return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
	}
}

// PUT API handler to update specific row by anvaya_no and sentno
export async function PUT(req: Request, { params }: { params: Params }) {
	const { book, part1, part2, chaptno, slokano } = params;
	const { anvaya_no, sentno, ...updateData } = await req.json();

	await dbConnect(); // Connect to the database

	try {
		// Construct query to find the row by slokano, anvaya_no, and sentno
		const query = {
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
			anvaya_no,
			sentno,
		};

		// Update the matching row
		const updatedRow = await Analysis.findOneAndUpdate(query, updateData, {
			new: true, // Return the updated document
		});

		if (!updatedRow) {
			return NextResponse.json({ message: "Row not found" }, { status: 404 });
		}

		return NextResponse.json({ message: "Update successful", updatedRow });
	} catch (error) {
		console.error("Error updating row:", error);
		return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
	}
}

export async function DELETE(req: Request, { params }: { params: Params }) {
	const { book, part1, part2, chaptno } = params;

	await dbConnect(); // Connect to the database

	try {
		// Construct the query
		const query = {
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
		};

		// Execute the delete operation
		const result = await Analysis.deleteMany(query);

		return NextResponse.json({
			message: `Deleted ${result.deletedCount} entries successfully.`,
		});
	} catch (error) {
		console.error("Error deleting entries:", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
