import { NextResponse } from "next/server";
import AHShloka from "@/lib/db/shlokasModel";

import dbConnect from "@/lib/db/connect";

export async function GET() {
	try {
		await dbConnect();
		const shlokas = await AHShloka.find({});
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