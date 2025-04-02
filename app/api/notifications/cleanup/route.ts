import { NextResponse } from "next/server";
import Notification from "@/lib/db/notificationModel";
import dbConnect from "@/lib/db/connect";

export async function POST(request: Request) {
	try {
		await dbConnect();

		// Get all notifications that should be deleted
		const notifications = await Notification.find({
			shouldDeleteAfterRead: true,
			readAt: { $exists: true },
		});

		const now = new Date();
		const deletedCount = { total: 0, errorReports: 0, regular: 0 };

		for (const notification of notifications) {
			let shouldDelete = false;

			// Check each user's read timestamp
			for (const [userId, readAt] of Object.entries(notification.readAt)) {
				const deleteTime = new Date(readAt);
				deleteTime.setHours(deleteTime.getHours() + notification.deleteAfterHours);

				if (now >= deleteTime) {
					shouldDelete = true;
					break;
				}
			}

			if (shouldDelete) {
				if (notification.isErrorReport) {
					deletedCount.errorReports++;
				} else {
					deletedCount.regular++;
				}
				deletedCount.total++;
				await Notification.findByIdAndDelete(notification._id);
			}
		}

		return NextResponse.json({
			success: true,
			deleted: deletedCount,
		});
	} catch (error) {
		console.error("Error cleaning up notifications:", error);
		return NextResponse.json({ error: "Error cleaning up notifications" }, { status: 500 });
	}
}
