import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AHShloka from "@/lib/db/newShlokaModel";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
	await dbConnect();

	try {
		const user = await currentUser();
		if (!user) {
			return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
		}

		const body = await request.json();
		const { book, part1, part2, chaptno, userPublished, groupPublished } = body;

		console.log("Chapter publish request body:", body);
		console.log("Validation check:", {
			book: !!book,
			part1: !!part1,
			part2: !!part2,
			chaptno: chaptno,
			chaptnoType: typeof chaptno,
			chaptnoTruthy: !!chaptno,
		});

		if (!book) {
			return NextResponse.json(
				{
					error: "Book is required",
					received: { book, part1, part2, chaptno },
				},
				{ status: 400 }
			);
		}

		// Handle case where chaptno is missing (shouldn't happen)
		if (chaptno === null || chaptno === undefined) {
			return NextResponse.json(
				{
					error: "Chapter number (chaptno) is required",
					received: { book, part1, part2, chaptno },
				},
				{ status: 400 }
			);
		}

		// Ensure chaptno is a string (as per the database schema)
		const chaptnoStr = typeof chaptno === "string" ? chaptno : chaptno.toString();
		if (!chaptnoStr) {
			return NextResponse.json(
				{
					error: "chaptno must be a valid string",
					received: { book, part1, part2, chaptno },
				},
				{ status: 400 }
			);
		}

		console.log("Query parameters:", { book, part1, part2, chaptno: chaptnoStr });

		// This endpoint is for chapter-level publishing only
		const query: any = {
			book,
			chaptno: chaptnoStr, // Use string, not number
		};

		// Only add part1 and part2 to query if they are not null
		if (part1 !== null) {
			query.part1 = part1;
		}
		if (part2 !== null) {
			query.part2 = part2;
		}

		console.log("Final query:", query);

		// Debug: Check what shlokas exist for this book
		const sampleShlokas = await AHShloka.find({ book }).limit(5);
		console.log(
			"Sample shlokas for book:",
			sampleShlokas.map((s) => ({
				book: s.book,
				part1: s.part1,
				part2: s.part2,
				chaptno: s.chaptno,
				chaptnoType: typeof s.chaptno,
			}))
		);

		const result = await AHShloka.updateMany(query, {
			$set: {
				...(userPublished !== undefined && { userPublished }),
				...(groupPublished !== undefined && { groupPublished }),
			},
		});

		console.log("Update result:", result);

		const chapterPath = [part1, part2, chaptno].filter((val) => val !== null).join("/");

		return NextResponse.json({
			message: `Successfully updated ${result.modifiedCount} shlokas in chapter ${chapterPath} of ${book}`,
			modifiedCount: result.modifiedCount,
			scope: `chapter ${chapterPath}`,
		});
	} catch (error) {
		console.error("Error updating chapter publishing status:", error);
		return NextResponse.json({ error: "Failed to update chapter publishing status" }, { status: 500 });
	}
}
