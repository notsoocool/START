import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AHShloka from "@/lib/db/newShlokaModel";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";

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

export async function POST(req: NextRequest) {
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	await dbConnect();

	try {
		const { book, part1, part2, chaptno, slokano, currentShlokaId } = await req.json();

		// Validate required fields
		if (!book || !chaptno || !slokano) {
			return NextResponse.json({ message: "Missing required fields" }, { status: 400, headers: corsHeaders() });
		}

		// Build query to find duplicate shloka numbers
		const query = {
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
			_id: { $ne: currentShlokaId }, // Exclude current shloka from the check
		};

		const existingShloka = await AHShloka.findOne(query);

		return NextResponse.json(
			{
				exists: !!existingShloka,
				message: existingShloka ? "A shloka with this number already exists in this chapter" : "Shloka number is available",
			},
			{ headers: corsHeaders() }
		);
	} catch (error) {
		console.error("Error checking duplicate shloka:", error);
		return NextResponse.json({ message: "Internal Server Error", error: (error as Error).message }, { status: 500, headers: corsHeaders() });
	}
}
