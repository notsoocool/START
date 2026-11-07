import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AHShloka from "@/lib/db/newShlokaModel";
import { requirePerms } from "@/lib/auth/requirePerms";
import { rollupPublishStatus } from "@/lib/books/publishStatus";

export async function GET(request: NextRequest) {
	await dbConnect();

	const auth = await requirePerms(["Admin", "Root"], request);
	if (auth instanceof NextResponse) return auth;

	try {
		// Chapter is published only when every shloka in it is (no partial)
		const chapterRows = await AHShloka.aggregate([
			{
				$group: {
					_id: {
						book: "$book",
						part1: { $ifNull: ["$part1", null] },
						part2: { $ifNull: ["$part2", null] },
						chaptno: "$chaptno",
					},
					userPublishedMin: { $min: { $cond: ["$userPublished", 1, 0] } },
					groupPublishedMin: { $min: { $cond: ["$groupPublished", 1, 0] } },
					lockedMin: { $min: { $cond: ["$locked", 1, 0] } },
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
					userPublished: { $eq: ["$userPublishedMin", 1] },
					groupPublished: { $eq: ["$groupPublishedMin", 1] },
					locked: { $eq: ["$lockedMin", 1] },
					shlokaCount: 1,
				},
			},
			{ $sort: { book: 1, part1: 1, part2: 1, chaptno: 1 } },
		]);

		const byBook = new Map<string, typeof chapterRows>();
		for (const ch of chapterRows) {
			const list = byBook.get(ch.book) || [];
			list.push(ch);
			byBook.set(ch.book, list);
		}

		const books = Array.from(byBook.entries())
			.map(([book, chapters]) => {
				const rolled = rollupPublishStatus(chapters);
				return {
					book,
					userPublished: rolled.userPublished,
					groupPublished: rolled.groupPublished,
					locked: rolled.locked,
					shlokaCount: chapters.reduce((n, c) => n + (c.shlokaCount || 0), 0),
				};
			})
			.sort((a, b) => a.book.localeCompare(b.book));

		return NextResponse.json({
			books,
			chapters: chapterRows,
		});
	} catch (error) {
		console.error("Error fetching book status:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
