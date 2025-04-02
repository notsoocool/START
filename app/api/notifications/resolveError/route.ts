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

		if (userPermissions.perms !== "Root") {
			return NextResponse.json({ error: "Only Root users can resolve error reports" }, { status: 403 });
		}

		const { notificationId, resolutionMessage } = await request.json();

		if (!notificationId || !resolutionMessage) {
			return NextResponse.json({ error: "Notification ID and resolution message are required" }, { status: 400 });
		}

		const errorNotification = await Notification.findById(notificationId);

		if (!errorNotification) {
			return NextResponse.json({ error: "Error report not found" }, { status: 404 });
		}

		if (!errorNotification.isErrorReport) {
			return NextResponse.json({ error: "This notification is not an error report" }, { status: 400 });
		}

		if (errorNotification.isResolved) {
			return NextResponse.json({ error: "This error report has already been resolved" }, { status: 400 });
		}

		// Create a resolution notification for the user who reported the error
		const resolutionNotification = await Notification.create({
			senderID: id,
			senderName: user.firstName + " " + user.lastName,
			recipientID: errorNotification.senderID,
			subject: `Error Report Resolved: ${errorNotification.subject}`,
			message: `Your error report has been resolved:\n\n${resolutionMessage}`,
			isFromUser: false,
			isErrorReport: false,
			isResolved: false,
			shouldDeleteAfterRead: true,
			deleteAfterHours: 24,
		});

		// Update the original error notification with resolution details
		const updatedNotification = await Notification.findByIdAndUpdate(
			notificationId,
			{
				isResolved: true,
				resolutionMessage,
				resolvedAt: new Date(),
				shouldDeleteAfterRead: true,
				deleteAfterHours: 24,
				$addToSet: { readBy: id },
			},
			{ new: true }
		);

		return NextResponse.json({ success: true, notification: updatedNotification });
	} catch (error) {
		console.error("Error resolving error report:", error);
		return NextResponse.json({ error: "Error resolving error report" }, { status: 500 });
	}
}
