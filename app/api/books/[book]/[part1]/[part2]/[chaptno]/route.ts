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

// Treat null, undefined, or string "null" as "no part" (query uses null)
const isNullParam = (v: unknown) => v == null || v === "null";

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

	// Query to match the specified book, part1, part2, and chapter.
	// When part2/part1 is null (or "null" string), we must explicitly add part2: null / part1: null,
	// otherwise omitting the field matches ALL values (e.g. part2: "1" would also match).
	const query: Record<string, unknown> = {
		chaptno,
	};
	if (!isNullParam(book)) query.book = book;
	if (isNullParam(part1)) query.part1 = null;
	else if (part1) query.part1 = part1;
	if (isNullParam(part2)) query.part2 = null;
	else if (part2) query.part2 = part2;

	// Fetch all shlokas for the specified chapter and sort by slokano (numeric order)
	const shlokas = await AHShloka.find(query).sort({
		slokano: 1, // Sort by slokano in ascending order
	});

	return NextResponse.json({ shlokas }, { headers: corsHeaders() });
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Params }
) {
	await dbConnect();
	const { book, part1, part2, chaptno } = params;
	const authResponse = await verifyDBAccess(request);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	// Build the query, explicitly including null when param is null/undefined/"null"
	const query = {
		book,
		part1: isNullParam(part1) ? null : part1,
		part2: isNullParam(part2) ? null : part2,
		chaptno,
	};

	try {
		console.log("Delete query:", query);
		console.time("Total deletion time");

		// First, get a count to estimate the operation size
		const count = await AHShloka.countDocuments(query);
		console.log(`Found ${count} shlokas to delete`);

		if (count === 0) {
			return NextResponse.json(
				{ message: "No entries found to delete." },
				{ headers: corsHeaders() }
			);
		}

		// For large deletions, skip detailed history logging to improve performance
		const shouldSkipDetailedLogging = count > 100;

		if (shouldSkipDetailedLogging) {
			console.log(
				"Large deletion detected, skipping detailed history logging for performance"
			);
		}

		// Delete all entries matching the query first
		console.time("Database deletion");
		const result = await AHShloka.deleteMany(query);
		console.timeEnd("Database deletion");
		console.log(`Deleted ${result.deletedCount} shlokas`);

		// Batch log the deletion instead of individual calls
		if (result.deletedCount > 0) {
			try {
				console.time("History logging");

				if (shouldSkipDetailedLogging) {
					// For large deletions, create a simple summary log
					await logHistory({
						action: "delete",
						modelType: "Shloka",
						details: {
							book,
							part1: isNullParam(part1) ? undefined : part1,
							part2: isNullParam(part2) ? undefined : part2,
							chaptno,
							slokano: "multiple",
							changes: [
								{
									field: "deleted_shlokas_summary",
									oldValue: {
										count: result.deletedCount,
										summary: `Bulk deletion of ${result.deletedCount} shlokas`,
									},
									newValue: null,
								},
							],
						},
					});
				} else {
					// For smaller deletions, get the details for logging
					const shlokasToDelete = await AHShloka.find(query);

					// Create a single batch history entry for all deleted shlokas
					await logHistory({
						action: "delete",
						modelType: "Shloka",
						details: {
							book,
							part1: isNullParam(part1) ? undefined : part1,
							part2: isNullParam(part2) ? undefined : part2,
							chaptno,
							slokano: "multiple",
							changes: [
								{
									field: "deleted_shlokas",
									oldValue: {
										count: shlokasToDelete.length,
										shlokas: shlokasToDelete.map(
											(shloka) => ({
												slokano: shloka.slokano,
												spart: shloka.spart,
												status: {
													locked: shloka.locked,
													userPublished:
														shloka.userPublished,
													groupPublished:
														shloka.groupPublished,
												},
											})
										),
									},
									newValue: null,
								},
							],
						},
					});
				}

				console.timeEnd("History logging");
				console.log("History logged successfully");
			} catch (historyError) {
				console.error("History logging failed:", historyError);
				// Don't fail the deletion if history logging fails
			}
		}

		console.timeEnd("Total deletion time");

		// Respond with the number of deleted entries
		return NextResponse.json(
			{
				message: `Deleted ${result.deletedCount} entries successfully.`,
				deletedCount: result.deletedCount,
				query,
				performance: {
					totalTime: "logged",
					largeDeletion: shouldSkipDetailedLogging,
				},
			},
			{ headers: corsHeaders() }
		);
	} catch (error) {
		console.error("Error deleting entries:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500, headers: corsHeaders() }
		);
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
			return NextResponse.json(
				{ error: "User not authenticated" },
				{ status: 401, headers: corsHeaders() }
			);
		}

		// Check if the book exists by finding any existing shloka with this book name
		const existingShloka = await AHShloka.findOne({ book });

		let userPublished = false;
		let groupPublished = false;
		let owner: string | null = null;

		if (existingShloka) {
			// Book exists - use the same publishing status as the book
			userPublished = existingShloka.userPublished || false;
			groupPublished = existingShloka.groupPublished || false;
			// Use the existing owner if it exists, otherwise set current user as owner
			owner = existingShloka.owner || user.id;
		} else {
			// Book is new - set owner to current user and keep publishing status as false
			// This ensures only the owner, root, and admin can see it
			owner = user.id;
			userPublished = false;
			groupPublished = false;
		}

		// Create new shloka
		const shloka = await AHShloka.create({
			book,
			part1: isNullParam(part1) ? null : part1,
			part2: isNullParam(part2) ? null : part2,
			chaptno,
			slokano: data.slokano,
			spart: data.spart,
			userPublished,
			groupPublished,
			locked: false,
			owner,
		});

		// Log the creation
		await logHistory({
			action: "create",
			modelType: "Shloka",
			details: {
				book,
				part1: isNullParam(part1) ? undefined : part1,
				part2: isNullParam(part2) ? undefined : part2,
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
		return NextResponse.json(
			{ error: "Failed to create shloka" },
			{ status: 500, headers: corsHeaders() }
		);
	}
}
