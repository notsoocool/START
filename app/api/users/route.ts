import { NextResponse } from "next/server";
import Perms from "@/lib/db/permissionsModel";
import dbConnect from "@/lib/db/connect";

export async function GET() {
	try {
		await dbConnect();
		// Get all users and map their permissions to the correct roles
		const users = await Perms.find({}, "userID name perms");

		// Map the permissions to the correct roles
		const mappedUsers = users.map((user) => ({
			...user.toObject(),
			perms: user.perms === "User" ? "Annotator" : "Editor",
		}));

		return NextResponse.json(mappedUsers);
	} catch (error) {
		console.error("Error fetching users:", error);
		return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
	}
}
