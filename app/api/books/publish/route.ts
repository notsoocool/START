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
		const { book, userPublished, groupPublished } = body;

		if (!book) {
			return NextResponse.json({ error: "Book name is required" }, { status: 400 });
		}

		// Update all shlokas for the specified book
		const result = await AHShloka.updateMany(
			{ book },
			{
				$set: {
					...(userPublished !== undefined && { userPublished }),
					...(groupPublished !== undefined && { groupPublished }),
				},
			}
		);

		return NextResponse.json({
			message: `Successfully updated ${result.modifiedCount} shlokas`,
			modifiedCount: result.modifiedCount,
		});
	} catch (error) {
		console.error("Error updating book publishing status:", error);
		return NextResponse.json({ error: "Failed to update book publishing status" }, { status: 500 });
	}
}
