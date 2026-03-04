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

		const { recipientID, recipientType, subject, message, isErrorReport, shouldDeleteAfterRead, deleteAfterHours } = await request.json();

		// Check if user is Root or if they're sending a message to Root
		const isRoot = userPermissions.perms === "Root";
		const isFromUser = !isRoot;

		// If not Root, they can only send messages to Root
		if (!isRoot && recipientID !== "admin") {
			return NextResponse.json({ error: "Regular users can only send messages to Root" }, { status: 403 });
		}

		const senderName = `${firstName} ${lastName}`;
		const notificationPayload = {
			senderID: id,
			senderName,
			subject,
			message,
			isFromUser,
			isErrorReport: isErrorReport || false,
			shouldDeleteAfterRead: shouldDeleteAfterRead || false,
			deleteAfterHours: deleteAfterHours || 24,
		};

		// Legacy: recipientID "admin" = send to Root (error reports from users)
		if (recipientID === "admin" && !recipientType) {
			const notification = new Notification({
				...notificationPayload,
				recipientID: "admin",
				recipientName: "Root",
			});
			await notification.save();
			return NextResponse.json({ success: true, notification, count: 1 });
		}

		// Resolve recipients based on recipientType or legacy recipientID
		let recipients: Array<{ userID: string; name: string }> = [];
		const type = recipientType ?? (recipientID === null || recipientID === "all" ? "all" : "user");

		if (type === "editors" || type === "annotators" || type === "admins") {
			const permsMap: Record<string, string> = {
				editors: "Editor",
				annotators: "Annotator",
				admins: "Admin",
			};
			const targetPerms = permsMap[type];
			const users = await Perms.find({ perms: targetPerms }).lean();
			recipients = users.map((u: { userID: string; name: string }) => ({ userID: u.userID, name: u.name }));
		} else if (type === "user" && recipientID) {
			const recipient = await Perms.findOne({ userID: recipientID });
			if (!recipient) {
				return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
			}
			recipients = [{ userID: recipient.userID, name: recipient.name }];
		} else if (type === "all") {
			// All users: single notification with recipientID null (broadcast)
			const notification = new Notification({
				...notificationPayload,
				recipientID: null,
				recipientName: null,
			});
			await notification.save();
			return NextResponse.json({ success: true, notification, count: 1 });
		}

		if (recipients.length === 0) {
			return NextResponse.json({ error: `No users found for ${type}` }, { status: 400 });
		}

		// Create one notification per recipient
		const notifications = await Promise.all(
			recipients.map((r) =>
				Notification.create({
					...notificationPayload,
					recipientID: r.userID,
					recipientName: r.name,
				})
			)
		);

		return NextResponse.json({ success: true, notifications, count: notifications.length });
	} catch (error) {
		console.error("Error sending notification:", error);
		return NextResponse.json({ error: "Error sending notification" }, { status: 500 });
	}
}
