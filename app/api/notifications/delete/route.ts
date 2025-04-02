import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Notification from "@/lib/db/notificationModel";
import Perms from "@/lib/db/permissionsModel";
import dbConnect from "@/lib/db/connect";

export async function DELETE(request: Request) {
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
		const notificationId = searchParams.get("notificationId");

		if (!notificationId) {
			return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
		}

		const notification = await Notification.findById(notificationId);

		if (!notification) {
			return NextResponse.json({ error: "Notification not found" }, { status: 404 });
		}

		// Only allow deletion if:
		// 1. User is Root
		// 2. User is the sender
		// 3. User is the recipient
		if (userPermissions.perms !== "Root" && notification.senderID !== id && notification.recipientID !== id) {
			return NextResponse.json({ error: "Not authorized to delete this notification" }, { status: 403 });
		}

		await Notification.findByIdAndDelete(notificationId);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting notification:", error);
		return NextResponse.json({ error: "Error deleting notification" }, { status: 500 });
	}
}
