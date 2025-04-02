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

		const { id, firstName, lastName } = user;
		const userPermissions = await Perms.findOne({ userID: id });

		if (!userPermissions) {
			return NextResponse.json({ error: "User permissions not found" }, { status: 404 });
		}

		const { recipientID, subject, message, isErrorReport, shouldDeleteAfterRead, deleteAfterHours } = await request.json();

		// Check if user is Root or if they're sending a message to Root
		const isRoot = userPermissions.perms === "Root";
		const isFromUser = !isRoot;

		// If not Root, they can only send messages to Root
		if (!isRoot && recipientID !== "admin") {
			return NextResponse.json({ error: "Regular users can only send messages to Root" }, { status: 403 });
		}

		// If Root is sending to a specific user, verify the user exists
		let recipientName = null;
		if (isRoot && recipientID !== "admin" && recipientID !== null) {
			const recipient = await Perms.findOne({ userID: recipientID });
			if (!recipient) {
				return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
			}
			recipientName = recipient.name;
		}

		// For error reports (recipientID: "admin"), always keep it as "admin"
		// For messages from regular users to Root, set recipientID to "admin"
		// For messages from Root to another Root user, keep the recipientID as is
		// For messages to all users (recipientID: null), keep recipientID as null
		const finalRecipientID = recipientID === "admin" ? "admin" : isFromUser ? "admin" : recipientID;

		// Create the notification
		const notification = new Notification({
			senderID: id,
			senderName: `${firstName} ${lastName}`,
			recipientID: finalRecipientID,
			recipientName: recipientName || (isFromUser || recipientID === "admin" ? "Root" : null),
			subject,
			message,
			isFromUser,
			isErrorReport: isErrorReport || false,
			shouldDeleteAfterRead: shouldDeleteAfterRead || false,
			deleteAfterHours: deleteAfterHours || 24,
		});

		await notification.save();

		return NextResponse.json({ success: true, notification });
	} catch (error) {
		console.error("Error sending notification:", error);
		return NextResponse.json({ error: "Error sending notification" }, { status: 500 });
	}
}
