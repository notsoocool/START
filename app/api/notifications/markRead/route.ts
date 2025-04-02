import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Notification from "@/lib/db/notificationModel";
import dbConnect from "@/lib/db/connect";

export async function POST(request: Request) {
	try {
		await dbConnect();
		const user = await currentUser();

		if (!user) {
			return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
		}

		const { id } = user;
		const { notificationId } = await request.json();

		if (!notificationId) {
			return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
		}

		// Update the notification to mark it as read
		const updatedNotification = await Notification.findByIdAndUpdate(notificationId, { isRead: true }, { new: true });

		if (!updatedNotification) {
			return NextResponse.json({ error: "Notification not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true, notification: updatedNotification });
	} catch (error) {
		console.error("Error marking notification as read:", error);
		return NextResponse.json({ error: "Error marking notification as read" }, { status: 500 });
	}
}
