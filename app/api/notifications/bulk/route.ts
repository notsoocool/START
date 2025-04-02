import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Notification from "@/lib/db/notificationModel";
import Perms from "@/lib/db/permissionsModel";
import dbConnect from "@/lib/db/connect";

export async function POST(request: Request) {
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

		const { operation, notificationIds, updates } = await request.json();

		if (!operation || !notificationIds || !Array.isArray(notificationIds)) {
			return NextResponse.json({ error: "Operation, notification IDs, and updates are required" }, { status: 400 });
		}

		// Verify all notifications exist and user has permission to modify them
		const notifications = await Notification.find({ _id: { $in: notificationIds } });

		if (notifications.length !== notificationIds.length) {
			return NextResponse.json({ error: "One or more notifications not found" }, { status: 404 });
		}

		// Check permissions for all notifications
		const unauthorizedNotifications = notifications.filter(
			(notification) => userPermissions.perms !== "Root" && notification.senderID !== id && notification.recipientID !== id
		);

		if (unauthorizedNotifications.length > 0) {
			return NextResponse.json({ error: "Not authorized to modify one or more notifications" }, { status: 403 });
		}

		let result;

		switch (operation) {
			case "markRead":
				result = await Notification.updateMany({ _id: { $in: notificationIds } }, { $addToSet: { readBy: id } });
				break;

			case "markUnread":
				result = await Notification.updateMany({ _id: { $in: notificationIds } }, { $pull: { readBy: id } });
				break;

			case "delete":
				result = await Notification.deleteMany({ _id: { $in: notificationIds } });
				break;

			case "update":
				if (!updates) {
					return NextResponse.json({ error: "Updates are required for update operation" }, { status: 400 });
				}
				result = await Notification.updateMany({ _id: { $in: notificationIds } }, { $set: updates });
				break;

			default:
				return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
		}

		return NextResponse.json({ success: true, result });
	} catch (error) {
		console.error("Error performing bulk operation:", error);
		return NextResponse.json({ error: "Error performing bulk operation" }, { status: 500 });
	}
}
