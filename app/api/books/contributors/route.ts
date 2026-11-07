import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AHShloka from "@/lib/db/newShlokaModel";
import Perms from "@/lib/db/permissionsModel";
import { requirePerms } from "@/lib/auth/requirePerms";

export const dynamic = "force-dynamic";

/** Admin/Root: list everyone who owns shlokas in a book (private contributors). */
export async function GET(request: NextRequest) {
	const auth = await requirePerms(["Admin", "Root"], request);
	if (auth instanceof NextResponse) return auth;

	const book = new URL(request.url).searchParams.get("book")?.trim();
	if (!book) {
		return NextResponse.json({ error: "book is required" }, { status: 400 });
	}

	await dbConnect();

	try {
		const rows = await AHShloka.aggregate([
			{
				$match: {
					book,
					owner: { $nin: [null, "", "none"] },
				},
			},
			{
				$group: {
					_id: "$owner",
					shlokaCount: { $sum: 1 },
				},
			},
			{ $sort: { shlokaCount: -1 } },
		]);

		const ids = rows.map((r) => String(r._id));
		const users = ids.length
			? await Perms.find({ userID: { $in: ids } }, "userID name perms").lean()
			: [];
		const byId = new Map(users.map((u: any) => [u.userID, u]));

		const contributors = rows.map((r) => {
			const id = String(r._id);
			const u = byId.get(id);
			return {
				userID: id,
				name: u?.name || id,
				perms: u?.perms || "?",
				shlokaCount: r.shlokaCount as number,
			};
		});

		return NextResponse.json({
			book,
			contributors,
			totalContributors: contributors.length,
			totalOwnedShlokas: contributors.reduce((n, c) => n + c.shlokaCount, 0),
		});
	} catch (error) {
		console.error("Error fetching book contributors:", error);
		return NextResponse.json(
			{ error: "Failed to fetch contributors" },
			{ status: 500 }
		);
	}
}
