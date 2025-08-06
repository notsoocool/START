import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AHShloka from "@/lib/db/newShlokaModel"; // Adjust the path as needed
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";
import Perms from "@/lib/db/permissionsModel";
import Group from "@/lib/db/groupModel";
import { currentUser } from "@clerk/nextjs/server";

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

export async function GET(request: NextRequest) {
	await dbConnect();

	try {
		// Get current user from Clerk
		const user = await currentUser();

		// Build the match condition based on user authentication and permissions
		let matchCondition = {};
		let userPermissions = null;

		if (!user) {
			// For unauthenticated users, show only user-published books that are not locked
			matchCondition = {
				$and: [{ userPublished: true }, { $or: [{ locked: { $ne: true } }, { locked: { $exists: false } }] }],
			};
		} else {
			// Get user permissions
			userPermissions = await Perms.findOne({ userID: user.id });
			if (!userPermissions) {
				return NextResponse.json({ error: "User permissions not found" }, { status: 404, headers: { ...corsHeaders } });
			}

			// Get user's groups and their assigned books
			const userGroups = await Group.find({ members: user.id });
			const userGroupIds = userGroups.map((group) => group._id.toString());
			const parentGroupIds = userGroups.filter((group) => group.parentGroup).map((group) => group.parentGroup);

			// Get all books assigned to user's groups
			const assignedBooks = userGroups.flatMap((group) => group.assignedBooks || []);
			const parentGroupBooks = await Group.find({
				_id: { $in: parentGroupIds },
			}).distinct("assignedBooks");
			const allAssignedBooks = [...assignedBooks, ...parentGroupBooks];

			if (userPermissions.perms === "User") {
				// Regular users can see:
				// 1. User-published books (regardless of owner/group)
				// 2. Their own books (if they are the owner)
				// 3. Group-published books from their assigned groups
				// 4. None of the above if the book is locked (except Admin/Root can see locked books)
				matchCondition = {
					$and: [
						{
							$or: [
								{ userPublished: true },
								{ owner: user.id },
								{
									$and: [{ groupPublished: true }, { book: { $in: allAssignedBooks } }],
								},
							],
						},
						{ $or: [{ locked: { $ne: true } }, { locked: { $exists: false } }] },
					],
				};
			} else if (userPermissions.perms === "Annotator" || userPermissions.perms === "Editor") {
				// Annotators and Editors can see:
				// 1. User-published books (regardless of owner/group)
				// 2. Group-published books from their assigned groups
				// 3. Their own books
				// 4. None of the above if the book is locked (except Admin/Root can see locked books)
				matchCondition = {
					$and: [
						{
							$or: [
								{ userPublished: true },
								{ owner: user.id },
								{
									$and: [{ groupPublished: true }, { book: { $in: allAssignedBooks } }],
								},
							],
						},
						{ $or: [{ locked: { $ne: true } }, { locked: { $exists: false } }] },
					],
				};
			} else if (userPermissions.perms === "Admin" || userPermissions.perms === "Root") {
				// Admins and Root can see everything, including locked books
				matchCondition = {};
			}
		}

		const tree = await AHShloka.aggregate([
			// Add match stage to filter based on permissions
			{
				$match: matchCondition,
			},
			// Filter to only show chapters that are individually published (but not for Admin/Root)
			...(userPermissions && userPermissions.perms !== "Admin" && userPermissions.perms !== "Root"
				? [
						{
							$match: {
								$or: [{ userPublished: true }, { groupPublished: true }],
							},
						},
				  ]
				: []),
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
					status: {
						$first: {
							locked: "$locked",
							userPublished: "$userPublished",
							groupPublished: "$groupPublished",
						},
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
					status: { $first: "$status" },
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
					status: { $first: "$status" },
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
					status: { $first: "$status" },
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
					status: 1,
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
								status: "$status",
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
