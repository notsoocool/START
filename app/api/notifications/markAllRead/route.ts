import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Notification from "@/lib/db/notificationModel";
import Perms from "@/lib/db/permissionsModel";
import dbConnect from "@/lib/db/connect";
import { notificationsVisibleTo } from "@/lib/notifications/visibleTo";

export async function POST() {
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

		const query = notificationsVisibleTo(id, userPermissions.perms);

		// Mark all as read: add user to readBy where not already present
		const result = await Notification.updateMany(
			{ ...query, readBy: { $nin: [id] } },
			{ $addToSet: { readBy: id }, $set: { [`readAt.${id}`]: new Date() } }
		);

		return NextResponse.json({
			success: true,
			modifiedCount: result.modifiedCount,
		});
	} catch (error) {
		console.error("Error marking all notifications as read:", error);
		return NextResponse.json(
			{ error: "Failed to mark all as read" },
			{ status: 500 }
		);
	}
}
