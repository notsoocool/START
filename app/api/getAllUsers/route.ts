// api/getAllUsers/route.ts
import { NextResponse } from "next/server";
import Perms from "@/lib/db/permissionsModel"; // Adjust the path as needed
import dbConnect from "@/lib/db/connect";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "10");
		const search = searchParams.get("search") || "";

		await dbConnect();

		// Create search query
		const searchQuery = search
			? {
					$or: [{ name: { $regex: search, $options: "i" } }, { perms: { $regex: search, $options: "i" } }],
			  }
			: {};

		// Get total count for pagination
		const total = await Perms.countDocuments(searchQuery);

		// Fetch paginated users
		const users = await Perms.find(searchQuery)
			.skip((page - 1) * limit)
			.limit(limit)
			.sort({ name: 1 }); // Sort by name alphabetically

		console.log(`Fetched ${users.length} users for page ${page}`);

		return NextResponse.json({
			users,
			pagination: {
				total,
				pages: Math.ceil(total / limit),
				currentPage: page,
				perPage: limit,
			},
		});
	} catch (error) {
		console.error("Error fetching Users:", error);
		return NextResponse.json({ error: "Error fetching Users" }, { status: 500 });
	}
}
