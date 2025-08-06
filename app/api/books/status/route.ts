import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AHShloka from "@/lib/db/newShlokaModel";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
	await dbConnect();

	try {
		const user = await currentUser();
		if (!user) {
			return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
		}

		// Get book-level status
		const books = await AHShloka.aggregate([
			{
				$group: {
					_id: "$book",
					userPublished: { $first: "$userPublished" },
					groupPublished: { $first: "$groupPublished" },
					locked: { $first: "$locked" },
					shlokaCount: { $sum: 1 },
				},
			},
			{
				$project: {
					_id: 0,
					book: "$_id",
					userPublished: 1,
					groupPublished: 1,
					locked: 1,
					shlokaCount: 1,
				},
			},
			{
				$sort: { book: 1 },
			},
		]);

		// Get chapter-level status - handle books with and without part1/part2
		const chapters = await AHShloka.aggregate([
			{
				$group: {
					_id: {
						book: "$book",
						part1: { $ifNull: ["$part1", null] },
						part2: { $ifNull: ["$part2", null] },
						chaptno: "$chaptno",
					},
					userPublished: { $first: "$userPublished" },
					groupPublished: { $first: "$groupPublished" },
					locked: { $first: "$locked" },
					shlokaCount: { $sum: 1 },
				},
			},
			{
				$project: {
					_id: 0,
					book: "$_id.book",
					part1: "$_id.part1",
					part2: "$_id.part2",
					chaptno: "$_id.chaptno",
					userPublished: 1,
					groupPublished: 1,
					locked: 1,
					shlokaCount: 1,
				},
			},
			{
				$sort: { book: 1, part1: 1, part2: 1, chaptno: 1 },
			},
		]);

		return NextResponse.json({
			books,
			chapters,
		});
	} catch (error) {
		console.error("Error fetching book status:", error);
		return NextResponse.json({ error: "Failed to fetch book status" }, { status: 500 });
	}
}
