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

		const { searchParams } = new URL(request.url);
		const groupId = searchParams.get("groupId");
		const search = searchParams.get("search") || "";

		if (!groupId) {
			return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
		}

		// Build the query
		const query: any = { groupId };
		if (search) {
			query.$or = [
				{ book: { $regex: search, $options: "i" } },
				{ part1: { $regex: search, $options: "i" } },
				{ part2: { $regex: search, $options: "i" } },
				{ chaptno: { $regex: search, $options: "i" } },
			];
		}

		const shlokas = await AHShloka.find(query)
			.select("_id book part1 part2 chaptno userPublished groupPublished groupId")
			.sort({ book: 1, part1: 1, part2: 1, chaptno: 1 });

		return NextResponse.json(shlokas);
	} catch (error) {
		console.error("Error fetching shlokas:", error);
		return NextResponse.json({ error: "Failed to fetch shlokas" }, { status: 500 });
	}
}
