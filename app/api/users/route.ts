import { NextResponse } from "next/server";
import Perms from "@/lib/db/permissionsModel";
import dbConnect from "@/lib/db/connect";

export async function GET(request: Request) {
	try {
		await dbConnect();
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get("page") || "1", 10);
		const limit = parseInt(searchParams.get("limit") || "10", 10);
		const ids = searchParams.get("ids");
		const search = searchParams.get("search") || "";
		const skip = (page - 1) * limit;

		let query: any = {};
		let total;

		// If specific IDs are requested, fetch only those users
		if (ids) {
			const idArray = ids.split(",").map((id) => id.trim());
			query = { userID: { $in: idArray } };
			total = await Perms.countDocuments(query);
			const users = await Perms.find(query, "userID name perms");

			const mappedUsers = users.map((user) => ({
				...user.toObject(),
				perms: user.perms,
			}));

			return NextResponse.json({ users: mappedUsers, total });
		}

		// Add search functionality
		if (search) {
			query = {
				$or: [
					{ name: { $regex: search, $options: "i" } },
					{ userID: { $regex: search, $options: "i" } },
				],
			};
		}

		// Fetch paginated users with optional search
		total = await Perms.countDocuments(query);
		const users = await Perms.find(query, "userID name perms")
			.skip(skip)
			.limit(limit)
			.sort({ name: 1 });

		const mappedUsers = users.map((user) => ({
			...user.toObject(),
			perms: user.perms,
		}));

		return NextResponse.json({ users: mappedUsers, total });
	} catch (error) {
		console.error("Error fetching users:", error);
		return NextResponse.json(
			{ error: "Failed to fetch users" },
			{ status: 500 }
		);
	}
}
