import Shloka from "@/lib/db/newShlokaModel";
import Analysis from "@/lib/db/newAnalysisModel";
import dbConnect from "@/lib/db/connect";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	await dbConnect();
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}
	// Parse the incoming JSON body
	const { book, part1, part2, shlokaData, analysisData } = await req.json();
	console.log({ book, part1, part2, shlokaData, analysisData });

	// Validate required fields
	if (!book) {
		return NextResponse.json({ error: "Book is required to upload" }, { status: 400 });
	}

	if (!shlokaData || !analysisData) {
		return NextResponse.json({ error: "Both shlokaData and analysisData are required" }, { status: 400 });
	}

	try {
		// Add book, part1, and part2 to each shloka and analysis entry
		const updatedShlokas = shlokaData.map((shloka: any) => ({
			...shloka,
			book,
			part1: part1 || null,
			part2: part2 || null,
			userPublished: false, // Default to false
			groupPublished: false, // Default to false
			locked: false, // Default to false
		}));

		const updatedAnalyses = analysisData.map((analysis: any) => ({
			...analysis,
			book,
			part1: part1 || null,
			part2: part2 || null,
		}));

		// Insert into MongoDB
		await Shloka.insertMany(updatedShlokas);
		await Analysis.insertMany(updatedAnalyses);

		return NextResponse.json({ success: true, message: "Data uploaded successfully" });
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: "Failed to upload data" }, { status: 500 });
	}
}
