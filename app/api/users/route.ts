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
		const role = searchParams.get("role") || searchParams.get("perms") || "";
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

		// Add role filter
		if (role && ["User", "Annotator", "Editor", "Admin", "Root"].includes(role)) {
			query.perms = role;
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

		// Get counts by role - always full counts (no role filter) for badge display
		const countMatch: any = search
			? { $or: [{ name: { $regex: search, $options: "i" } }, { userID: { $regex: search, $options: "i" } }] }
			: {};
		const countsByRole = await Perms.aggregate([
			{ $match: countMatch },
			{ $group: { _id: "$perms", count: { $sum: 1 } } },
		]);
		const roleCounts = {
			User: 0,
			Annotator: 0,
			Editor: 0,
			Admin: 0,
			Root: 0,
		};
		countsByRole.forEach((r) => {
			if (r._id in roleCounts) roleCounts[r._id as keyof typeof roleCounts] = r.count;
		});

		return NextResponse.json({ users: mappedUsers, total, countsByRole: roleCounts });
	} catch (error) {
		console.error("Error fetching users:", error);
		return NextResponse.json(
			{ error: "Failed to fetch users" },
			{ status: 500 }
		);
	}
}
