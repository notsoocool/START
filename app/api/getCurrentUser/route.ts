// api/getCurrentUser/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Perms from "@/lib/db/permissionsModel"; // Import your Mongoose model
import dbConnect from "@/lib/db/connect";

export async function GET() {
	await dbConnect();
	const user = await currentUser();

	if (!user) {
		return NextResponse.json(
			{ error: "User not authenticated" },
			{ status: 401 }
		);
	}

	// Extracting user ID, first name, and last name
	const { id, firstName, lastName } = user;

	// Connect to the database

	// Fetching user permissions from the database
	const userPermissions = await Perms.findOne({ userID: id });

	if (!userPermissions) {
		return NextResponse.json(
			{ error: "User permissions not found" },
			{ status: 404 }
		);
	}
	return NextResponse.json({
		id,
		firstName,
		lastName,
		perms: userPermissions.perms,
	});
}
