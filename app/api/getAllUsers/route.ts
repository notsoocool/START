// api/getAllUsers/route.ts
import { NextResponse } from "next/server";
import Perms from "@/lib/db/permissionsModel"; // Adjust the path as needed
import dbConnect from "@/lib/db/connect";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "10");
		const search = searchParams.get("search") || "";
		const fetchAll = searchParams.get("all") === "true" || limit === 0;

		await dbConnect();

		// Create search query
		const searchQuery = search
			? {
					$or: [{ name: { $regex: search, $options: "i" } }, { perms: { $regex: search, $options: "i" } }],
			  }
			: {};

		// Get total count for pagination
		const total = await Perms.countDocuments(searchQuery);

		// Fetch users (all or paginated)
		const users = fetchAll
			? await Perms.find(searchQuery).sort({ name: 1 }).lean()
			: await Perms.find(searchQuery)
					.skip((page - 1) * limit)
					.limit(limit)
					.sort({ name: 1 })
					.lean();

		console.log(`Fetched ${users.length} users${fetchAll ? " (all)" : ` for page ${page}`}`);

		return NextResponse.json({
			users,
			pagination: fetchAll
				? { total, pages: 1, currentPage: 1, perPage: total }
				: {
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
