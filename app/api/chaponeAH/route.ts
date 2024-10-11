import { NextResponse } from "next/server";
import ChaponeAH from "@/lib/db/chaponeAHModel"; // Adjust the import based on your model's location

import dbConnect from "@/lib/db/connect";

export async function GET() {
	try {
		await dbConnect();
		const shlokas = await ChaponeAH.find({});
		console.log("Fetched Shlokas"); // Add debug log
		return NextResponse.json(shlokas);
	} catch (error) {
		console.error("Error fetching shlokas:", error); // Add debug log
		return NextResponse.json(
			{ error: "Error fetching shlokas" },
			{ status: 500 }
		);
	}
}
