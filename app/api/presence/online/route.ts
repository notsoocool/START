import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db/connect";
import Presence from "@/lib/db/presenceModel";
import Perms from "@/lib/db/permissionsModel";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
	const user = await currentUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		await dbConnect();

		// Check if current user is Admin or Root
		const perms = await Perms.findOne({ userID: user.id });
		if (!perms || (perms.perms !== "Admin" && perms.perms !== "Root")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MS);
		const presences = await Presence.find({ lastActiveAt: { $gte: threshold } })
			.sort({ lastActiveAt: -1 })
			.lean();

		const userIds = presences.map((p) => p.userID);
		const permsList = await Perms.find({ userID: { $in: userIds } }).lean();

		const userMap = new Map(permsList.map((p) => [p.userID, p]));

		const onlineUsers = presences.map((p) => {
			const perm = userMap.get(p.userID);
			return {
				userID: p.userID,
				name: perm?.name ?? "Unknown",
				perms: perm?.perms ?? "User",
				lastActiveAt: p.lastActiveAt,
			};
		});

		return NextResponse.json({ users: onlineUsers });
	} catch (error) {
		console.error("Online users fetch error:", error);
		return NextResponse.json({ error: "Failed to fetch online users" }, { status: 500 });
	}
}
