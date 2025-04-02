import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Notification from "@/lib/db/notificationModel";
import Perms from "@/lib/db/permissionsModel";
import dbConnect from "@/lib/db/connect";

export async function PUT(request: Request) {
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

		const { notificationId, updates } = await request.json();

		if (!notificationId || !updates) {
			return NextResponse.json({ error: "Notification ID and updates are required" }, { status: 400 });
		}

		const notification = await Notification.findById(notificationId);

		if (!notification) {
			return NextResponse.json({ error: "Notification not found" }, { status: 404 });
		}

		// Only allow updates if:
		// 1. User is Root
		// 2. User is the sender
		// 3. User is the recipient
		if (userPermissions.perms !== "Root" && notification.senderID !== id && notification.recipientID !== id) {
			return NextResponse.json({ error: "Not authorized to update this notification" }, { status: 403 });
		}

		// Update the notification
		const updatedNotification = await Notification.findByIdAndUpdate(notificationId, { $set: updates }, { new: true });

		return NextResponse.json({ success: true, notification: updatedNotification });
	} catch (error) {
		console.error("Error updating notification:", error);
		return NextResponse.json({ error: "Error updating notification" }, { status: 500 });
	}
}
