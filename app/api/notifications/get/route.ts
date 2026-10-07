import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Notification from "@/lib/db/notificationModel";
import Perms from "@/lib/db/permissionsModel";
import dbConnect from "@/lib/db/connect";
import { notificationsVisibleTo } from "@/lib/notifications/visibleTo";

export const dynamic = "force-dynamic";

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
		const query = notificationsVisibleTo(id, userPermissions.perms);

		// Count total notifications for pagination, and unread across every page.
		const total = await Notification.countDocuments(query);
		const unread = await Notification.countDocuments({ ...query, readBy: { $nin: [id] } });
		const pages = Math.ceil(total / limit);

		// Fetch paginated notifications
		const notifications = await Notification.find(query)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.lean();

		// Add isRead field for each notification
		const notificationsWithReadStatus = notifications.map((notification) => ({
			...notification,
			isRead: notification.readBy?.includes(id) || false,
		}));

		return NextResponse.json({
			notifications: notificationsWithReadStatus,
			pagination: {
				page,
				pages,
				total,
				unread,
			},
		});
	} catch (error) {
		console.error("Error fetching notifications:", error);
		return NextResponse.json({ error: "Error fetching notifications" }, { status: 500 });
	}
}
