import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AHShloka from "@/lib/db/newShlokaModel"; // Adjust the path as needed
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";

// Helper function to handle CORS
const corsHeaders = {
	"Access-Control-Allow-Origin": "*", // Be more restrictive in production
	"Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
	return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
	await dbConnect();

	try {
		const tree = await AHShloka.aggregate([
			// Initial sorting
			{
				$sort: {
					book: 1,
					part1: 1,
					part2: 1,
					chaptno: 1,
				},
			},
			{
				$group: {
					_id: {
						book: "$book",
						part1: "$part1",
						part2: "$part2",
						chaptno: "$chaptno",
					},
				},
			},
			{
				$group: {
					_id: {
						book: "$_id.book",
						part1: "$_id.part1",
						part2: "$_id.part2",
					},
					chapters: {
						$push: "$_id.chaptno",
					},
				},
			},
			// Sort chapters array
			{
				$addFields: {
					chapters: {
						$sortArray: {
							input: "$chapters",
							sortBy: 1,
						},
					},
				},
			},
			{
				$group: {
					_id: {
						book: "$_id.book",
						part1: "$_id.part1",
					},
					part2: {
						$push: {
							part: "$_id.part2",
							chapters: "$chapters",
						},
					},
				},
			},
			// Sort part2 array
			{
				$addFields: {
					part2: {
						$sortArray: {
							input: "$part2",
							sortBy: { part: 1 },
						},
					},
				},
			},
			{
				$group: {
					_id: "$_id.book",
					part1: {
						$push: {
							part: "$_id.part1",
							part2: "$part2",
						},
					},
				},
			},
			// Sort part1 array
			{
				$addFields: {
					part1: {
						$sortArray: {
							input: "$part1",
							sortBy: { part: 1 },
						},
					},
				},
			},
			{
				$project: {
					_id: 0,
					book: "$_id",
					part1: 1,
				},
			},
			// Add this stage to enforce field order
			{
				$replaceRoot: {
					newRoot: {
						$mergeObjects: [
							{
								book: "$book",
								part1: "$part1",
							},
						],
					},
				},
			},
			// Final sort by book
			{
				$sort: {
					book: 1,
				},
			},
		]);

		return NextResponse.json(tree, { headers: { ...corsHeaders } });
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching tree data",
				error: (error as Error).message,
			},
			{ status: 500, headers: { ...corsHeaders } }
		);
	}
}

export async function DELETE(request: NextRequest) {
	await dbConnect();
	const authResponse = await verifyDBAccess(request);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	const { searchParams } = new URL(request.url); // Extract the searchParams from the request URL
	const book = searchParams.get("book"); // Get the "book" query parameter

	try {
		if (book) {
			// Delete all entries for the specified book
			const result = await AHShloka.deleteMany({ book });
			return NextResponse.json(
				{
					success: true,
					message: `${result.deletedCount} entries deleted for the book: ${book}`,
				},
				{ headers: { ...corsHeaders } }
			);
		} else {
			// Delete all entries if no book is specified
			const result = await AHShloka.deleteMany({});
			return NextResponse.json(
				{
					success: true,
					message: `${result.deletedCount} entries deleted for all books`,
				},
				{ headers: { ...corsHeaders } }
			);
		}
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: "Error deleting entries",
				error: (error as Error).message,
			},
			{ status: 500, headers: { ...corsHeaders } }
		);
	}
}
