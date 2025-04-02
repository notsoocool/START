import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Notification from "@/lib/db/notificationModel";
import Perms from "@/lib/db/permissionsModel";
import dbConnect from "@/lib/db/connect";

export async function GET(request: Request) {
	try {
		await dbConnect();
		const user = await currentUser();

		if (!user) {
			return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
		}

		const { id } = user;
		const userPermissions = await Perms.findOne({ userID: id });

		if (!userPermissions) {
			return NextResponse.json({ error: "User permissions not found" }, { status: 404 });
		}

		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "10");
		const isRoot = userPermissions.perms === "Root";

		// Root can see all notifications
		// Regular users can only see notifications sent to them or to all users
		const query = isRoot
			? {}
			: {
					$or: [
						{ recipientID: id },
						{ recipientID: null }, // Messages sent to all users
					],
			  };

		// Get total count for pagination
		const total = await Notification.countDocuments(query);

		// Fetch paginated notifications
		const notifications = await Notification.find(query)
			.sort({ createdAt: -1 }) // Sort by newest first
			.skip((page - 1) * limit)
			.limit(limit);

		return NextResponse.json({
			notifications,
			pagination: {
				total,
				pages: Math.ceil(total / limit),
				currentPage: page,
				perPage: limit,
			},
		});
	} catch (error) {
		console.error("Error fetching notifications:", error);
		return NextResponse.json({ error: "Error fetching notifications" }, { status: 500 });
	}
}
