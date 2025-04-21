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
		const { shlokaId, userPublished, groupPublished } = body;

		if (!shlokaId) {
			return NextResponse.json({ error: "Shloka ID is required" }, { status: 400 });
		}

		const shloka = await AHShloka.findById(shlokaId);
		if (!shloka) {
			return NextResponse.json({ error: "Shloka not found" }, { status: 404 });
		}

		// Update the publishing status
		if (userPublished !== undefined) {
			shloka.userPublished = userPublished;
		}
		if (groupPublished !== undefined) {
			shloka.groupPublished = groupPublished;
		}

		await shloka.save();

		return NextResponse.json({ message: "Publishing status updated successfully" });
	} catch (error) {
		console.error("Error updating publishing status:", error);
		return NextResponse.json({ error: "Failed to update publishing status" }, { status: 500 });
	}
}
