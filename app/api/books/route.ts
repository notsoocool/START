import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AHShloka from "@/lib/db/newShlokaModel"; // Adjust the path as needed
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";
import Perms from "@/lib/db/permissionsModel";
import { currentUser } from "@clerk/nextjs/server";
import { rollupPublishStatus } from "@/lib/books/publishStatus";
import {
	e2eBypassUser,
	requestHasValidE2EBypass,
} from "@/lib/auth/e2eBypass";

// Helper function to handle CORS
const corsHeaders = {
	"Access-Control-Allow-Origin": "*", // Be more restrictive in production
	"Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const dynamic = "force-dynamic";

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
	return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
	await dbConnect();

	try {
		// Local E2E bypass header/cookie → Root view (no Clerk, no DB user upsert)
		const e2eRoot = requestHasValidE2EBypass(request)
			? e2eBypassUser()
			: null;
		const user = e2eRoot
			? ({ id: e2eRoot.userId } as Awaited<ReturnType<typeof currentUser>>)
			: await currentUser();

		// Visibility: User = public/own only. Annotator+ = also groupPublished (view).
		// Editing still requires group membership + Annotator/Editor elsewhere.
		let matchCondition: Record<string, unknown> = {};
		let userPermissions: { perms: string; userID?: string } | null = null;
		const isAdminOrRoot = (perms?: string | null) =>
			perms === "Admin" || perms === "Root";

		if (e2eRoot) {
			userPermissions = { perms: "Root", userID: e2eRoot.userId };
			matchCondition = {};
		} else if (!user) {
			matchCondition = {
				$and: [
					{ userPublished: true },
					{
						$or: [
							{ locked: { $ne: true } },
							{ locked: { $exists: false } },
						],
					},
				],
			};
		} else {
			userPermissions = await Perms.findOne({ userID: user.id });
			if (!userPermissions) {
				return NextResponse.json(
					{ error: "User permissions not found" },
					{ status: 404, headers: { ...corsHeaders } }
				);
			}

			if (isAdminOrRoot(userPermissions.perms)) {
				matchCondition = {};
			} else if (userPermissions.perms === "User") {
				// Users: public + own only (no group-shared)
				matchCondition = {
					$and: [
						{
							$or: [{ userPublished: true }, { owner: user.id }],
						},
						{
							$or: [
								{ locked: { $ne: true } },
								{ locked: { $exists: false } },
							],
						},
					],
				};
			} else {
				// Annotator / Editor / Developer: public, own, or any group-shared
				matchCondition = {
					$and: [
						{
							$or: [
								{ userPublished: true },
								{ owner: user.id },
								{ groupPublished: true },
							],
						},
						{
							$or: [
								{ locked: { $ne: true } },
								{ locked: { $exists: false } },
							],
						},
					],
				};
			}
		}

		const tree = await AHShloka.aggregate([
			{
				$match: matchCondition,
			},
			...(userPermissions &&
			!isAdminOrRoot(userPermissions.perms) &&
			user
				? [
						{
							$match:
								userPermissions.perms === "User"
									? {
											$or: [
												{ userPublished: true },
												{ owner: user.id },
											],
									  }
									: {
											$or: [
												{ userPublished: true },
												{ owner: user.id },
												{ groupPublished: true },
											],
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
					userPublishedMin: {
						$min: { $cond: [{ $eq: ["$userPublished", true] }, 1, 0] },
					},
					groupPublishedMin: {
						$min: { $cond: [{ $eq: ["$groupPublished", true] }, 1, 0] },
					},
					lockedMin: { $min: { $cond: [{ $eq: ["$locked", true] }, 1, 0] } },
					owners: { $addToSet: "$owner" },
				},
			},
			{
				$addFields: {
					status: {
						// Published only when every shloka in the chapter matches (no partial)
						userPublished: { $eq: ["$userPublishedMin", 1] },
						groupPublished: { $eq: ["$groupPublishedMin", 1] },
						locked: { $eq: ["$lockedMin", 1] },
						owners: {
							$filter: {
								input: "$owners",
								as: "o",
								cond: {
									$and: [
										{ $ne: ["$$o", null] },
										{ $ne: ["$$o", ""] },
										{ $ne: ["$$o", "none"] },
									],
								},
							},
						},
					},
				},
			},
			{
				$addFields: {
					"status.owner": {
						$cond: [
							{ $gt: [{ $size: "$status.owners" }, 0] },
							{ $arrayElemAt: ["$status.owners", 0] },
							null,
						],
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
						$push: {
							chaptno: "$_id.chaptno",
							status: "$status",
						},
					},
				},
			},
			{
				$addFields: {
					chapters: {
						$sortArray: {
							input: "$chapters",
							sortBy: { chaptno: 1 },
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
			{
				$sort: {
					book: 1,
				},
			},
		]);

		const withStatus = tree.map((book: any) => {
			const chapterStatuses: any[] = [];
			for (const p1 of book.part1 || []) {
				for (const p2 of p1.part2 || []) {
					for (const ch of p2.chapters || []) {
						if (ch?.status) chapterStatuses.push(ch.status);
					}
				}
			}
			return {
				...book,
				status: rollupPublishStatus(chapterStatuses),
			};
		});

		return NextResponse.json(withStatus, { headers: { ...corsHeaders } });
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
