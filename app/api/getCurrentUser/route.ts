// api/getCurrentUser/route.ts
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Perms from "@/lib/db/permissionsModel"; // Import your Mongoose model
import dbConnect from "@/lib/db/connect";
import { e2eBypassUser, requestHasValidE2EBypass } from "@/lib/auth/e2eBypass";

export async function GET(req: NextRequest) {
	await dbConnect();

	if (requestHasValidE2EBypass(req)) {
		const bypass = e2eBypassUser();
		await Perms.findOneAndUpdate(
			{ userID: bypass.userId },
			{ userID: bypass.userId, name: bypass.name, perms: bypass.perms },
			{ upsert: true, new: true }
		);
		return NextResponse.json({
			id: bypass.userId,
			firstName: bypass.firstName,
			lastName: bypass.lastName,
			perms: bypass.perms,
		});
	}

	const user = await currentUser();

	if (!user) {
		return NextResponse.json(
			{ error: "User not authenticated" },
			{ status: 401 }
		);
	}

	// Extracting user ID, first name, and last name
	const { id, firstName, lastName } = user;

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
