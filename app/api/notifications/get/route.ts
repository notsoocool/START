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

		// Build the query based on user permissions
		let query: any = {};

		if (userPermissions.perms === "Root") {
			// Root users can see all notifications except resolution notifications
			query = {
				$or: [{ subject: { $not: { $regex: "Error Report Resolved:", $options: "i" } } }, { subject: { $exists: false } }],
			};
		} else {
			// Regular users can only see:
			// 1. Notifications sent to them (excluding error reports)
			// 2. Notifications sent to all users (excluding error reports)
			// 3. Resolution notifications sent to them
			query = {
				$or: [
					{
						$and: [
							{
								$or: [{ recipientID: id }, { recipientID: null }],
							},
							{
								$or: [{ isErrorReport: false }, { isErrorReport: { $exists: false } }],
							},
						],
					},
					{
						$and: [{ recipientID: id }, { subject: { $regex: "Error Report Resolved:", $options: "i" } }],
					},
				],
			};
		}

		// Count total notifications for pagination
		const total = await Notification.countDocuments(query);
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
			},
		});
	} catch (error) {
		console.error("Error fetching notifications:", error);
		return NextResponse.json({ error: "Error fetching notifications" }, { status: 500 });
	}
}
