import { NextResponse } from "next/server";
import Perms from "@/lib/db/permissionsModel";
import dbConnect from "@/lib/db/connect";

export async function GET(request: Request) {
	try {
		await dbConnect();
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get("page") || "1", 10);
		const limit = parseInt(searchParams.get("limit") || "10", 10);
		const skip = (page - 1) * limit;

		const total = await Perms.countDocuments();
		const users = await Perms.find({}, "userID name perms").skip(skip).limit(limit);

		const mappedUsers = users.map((user) => ({
			...user.toObject(),
			perms: user.perms,
		}));

		return NextResponse.json({ users: mappedUsers, total });
	} catch (error) {
		console.error("Error fetching users:", error);
		return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
	}
}
