// /app/api/books/[book]/[part1]/[part2]/[chaptno]/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AHShloka from "@/lib/db/newShlokaModel";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";
import { currentUser } from "@clerk/nextjs/server";
import { logHistory } from "@/lib/utils/historyLogger";

interface Params {
	book: string;
	part1: string;
	part2: string;
	chaptno: string;
}

// Add CORS headers helper function
function corsHeaders() {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	};
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
	return NextResponse.json({}, { headers: corsHeaders() });
}

export async function GET(request: Request, { params }: { params: Params }) {
	await dbConnect();
	const { book, part1, part2, chaptno } = params;

	// Query to match the specified book, part1, part2, and chapter
	const query = {
		...(book !== "null" && { book }),
		...(part1 !== "null" && { part1 }),
		...(part2 !== "null" && { part2 }),
		chaptno,
	};

	// Fetch all shlokas for the specified chapter and sort by slokano (numeric order)
	const shlokas = await AHShloka.find(query).sort({
		slokano: 1, // Sort by slokano in ascending order
	});

	return NextResponse.json({ shlokas }, { headers: corsHeaders() });
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
	await dbConnect();
	const { book, part1, part2, chaptno } = params;
	const authResponse = await verifyDBAccess(request);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	// Build the query dynamically, excluding null values
	const query = {
		...(book !== "null" && { book }),
		...(part1 !== "null" && { part1 }),
		...(part2 !== "null" && { part2 }),
		chaptno,
	};

	try {
		// Get the shlokas before deletion for logging
		const shlokasToDelete = await AHShloka.find(query);

		// Delete all entries matching the query
		const result = await AHShloka.deleteMany(query);

		// Log the deletion of each shloka
		for (const shloka of shlokasToDelete) {
			await logHistory({
				action: "delete",
				modelType: "Shloka",
				details: {
					book: shloka.book,
					part1: shloka.part1 || undefined,
					part2: shloka.part2 || undefined,
					chaptno: shloka.chaptno,
					slokano: shloka.slokano,
					changes: [
						{
							field: "deleted_shloka",
							oldValue: {
								slokano: shloka.slokano,
								spart: shloka.spart,
								status: {
									locked: shloka.locked,
									userPublished: shloka.userPublished,
									groupPublished: shloka.groupPublished,
								},
							},
							newValue: null,
						},
					],
				},
			});
		}

		// Respond with the number of deleted entries
		return NextResponse.json({ message: `Deleted ${result.deletedCount} entries successfully.` }, { headers: corsHeaders() });
	} catch (error) {
		console.error("Error deleting entries:", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: corsHeaders() });
	}
}

export async function POST(request: Request, { params }: { params: Params }) {
	await dbConnect();
	const { book, part1, part2, chaptno } = params;
	const data = await request.json();

	try {
		// Get current user from Clerk
		const user = await currentUser();
		if (!user) {
			return NextResponse.json({ error: "User not authenticated" }, { status: 401, headers: corsHeaders() });
		}

		// Create new shloka
		const shloka = await AHShloka.create({
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano: data.slokano,
			spart: data.spart,
			userPublished: false,
			groupPublished: false,
			locked: false,
			owner: user.id,
		});

		// Log the creation
		await logHistory({
			action: "create",
			modelType: "Shloka",
			details: {
				book,
				part1: part1 !== "null" ? part1 : undefined,
				part2: part2 !== "null" ? part2 : undefined,
				chaptno,
				slokano: data.slokano,
				changes: [
					{
						field: "new_shloka",
						oldValue: null,
						newValue: {
							slokano: data.slokano,
							spart: data.spart,
						},
					},
				],
			},
		});

		return NextResponse.json(shloka, { headers: corsHeaders() });
	} catch (error) {
		console.error("Error creating shloka:", error);
		return NextResponse.json({ error: "Failed to create shloka" }, { status: 500, headers: corsHeaders() });
	}
}
