// api/getAllUsers/route.ts
import { NextResponse } from "next/server";
import Perms from "@/lib/db/permissionsModel"; // Adjust the path as needed
import dbConnect from "@/lib/db/connect";

export async function GET() {
    try {
		await dbConnect();
		const users = await Perms.find({});
		console.log("Fetched Users"); // Add debug log
		return NextResponse.json(users);
	} catch (error) {
		console.error("Error fetching Users:", error); // Add debug log
		return NextResponse.json(
			{ error: "Error fetching Users" },
			{ status: 500 }
		);
	}
}
