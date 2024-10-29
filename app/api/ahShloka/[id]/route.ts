import { NextResponse } from "next/server";
import AHShloka from "@/lib/db/newShlokaModel";
import dbConnect from "@/lib/db/connect";
import { ObjectId } from "mongodb";

// Handler for GET requests (fetching snippet by ID)
export async function GET(
	req: Request,
	{ params }: { params: { id: string } }
) {
	try {
		// Connect to the database
		await dbConnect();

		const { id } = params; // Extract the snippet ID from the request params

		// Check if the ID is a valid MongoDB ObjectId
		if (!ObjectId.isValid(id)) {
			return NextResponse.json(
				{ error: "Invalid Shloka ID" },
				{ status: 400 }
			);
		}

		// Find the snippet by ID in the database
		const shloka = await AHShloka.findById(id);

		// If snippet not found, return a 404 error
		if (!shloka) {
			return NextResponse.json(
				{ error: "Shloka not found" },
				{ status: 404 }
			);
		}

		// Return the snippet as JSON
		return NextResponse.json(shloka, { status: 200 });
	} catch (error) {
		console.error("Error fetching shloka:", error);
		return NextResponse.json(
			{ error: "Error fetching shloka" },
			{ status: 500 }
		);
	}
}
