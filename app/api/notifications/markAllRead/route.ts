import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Notification from "@/lib/db/notificationModel";
import Perms from "@/lib/db/permissionsModel";
import dbConnect from "@/lib/db/connect";

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

		// Same query as get route - notifications the user can see
		let query: Record<string, unknown> = {};

		if (userPermissions.perms === "Root") {
			query = {
				$or: [
					{ subject: { $not: { $regex: "Error Report Resolved:", $options: "i" } } },
					{ subject: { $exists: false } },
				],
			};
		} else {
			query = {
				$or: [
					{
						$and: [
							{ $or: [{ recipientID: id }, { recipientID: null }] },
							{
								$or: [{ isErrorReport: false }, { isErrorReport: { $exists: false } }],
							},
						],
					},
					{
						$and: [
							{ recipientID: id },
							{ subject: { $regex: "Error Report Resolved:", $options: "i" } },
						],
					},
				],
			};
		}

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
