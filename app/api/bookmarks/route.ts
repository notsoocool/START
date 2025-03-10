import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Bookmark from "@/lib/db/bookmarksModel";
import Shloka from "@/lib/db/newShlokaModel";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(request: Request) {
	try {
		const user = await currentUser();
		if (!user) {
			return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
		}

		await dbConnect();

		const { searchParams } = new URL(request.url);
		const shlokaID = searchParams.get("shlokaID");

		// If shlokaID is provided, check if it's bookmarked
		if (shlokaID) {
			const bookmark = await Bookmark.findOne({
				userID: user.id,
				shlokaID: shlokaID,
			});
			return NextResponse.json({ isBookmarked: !!bookmark });
		}

		// Otherwise, get all bookmarked shlokas
		const bookmarks = await Bookmark.find({ userID: user.id });
		const shlokaIds = bookmarks.map((bookmark) => bookmark.shlokaID);

		const shlokas = await Shloka.find({
			_id: { $in: shlokaIds },
		});

		return NextResponse.json({ shlokas });
	} catch (error) {
		console.error("Error in GET /api/bookmarks:", error);
		return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const user = await currentUser();
		if (!user) {
			return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
		}

		await dbConnect();
		const { analysisID, shlokaID } = await request.json();

		// Check if bookmark already exists
		const existingBookmark = await Bookmark.findOne({
			userID: user.id,
			analysisID: analysisID,
		});

		if (existingBookmark) {
			return NextResponse.json({ error: "Already bookmarked", bookmark: existingBookmark }, { status: 400 });
		}

		const bookmark = await Bookmark.create({
			userID: user.id,
			analysisID,
			shlokaID,
		});

		return NextResponse.json({ message: "Bookmark added", bookmark });
	} catch (error) {
		console.error("Bookmark POST error:", error);
		return NextResponse.json({ error: "Failed to add bookmark" }, { status: 500 });
	}
}

export async function DELETE(request: Request) {
	try {
		const user = await currentUser();
		if (!user) {
			return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const shlokaID = searchParams.get("shlokaID");

		if (!shlokaID) {
			return NextResponse.json({ error: "Shloka ID is required" }, { status: 400 });
		}

		await dbConnect();

		// Delete the bookmark using shlokaID instead of analysisID
		const result = await Bookmark.findOneAndDelete({
			userID: user.id,
			shlokaID: shlokaID,
		});

		if (!result) {
			return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
		}

		return NextResponse.json({ message: "Bookmark removed" });
	} catch (error) {
		console.error("Error in DELETE /api/bookmarks:", error);
		return NextResponse.json({ error: "Failed to remove bookmark" }, { status: 500 });
	}
}
