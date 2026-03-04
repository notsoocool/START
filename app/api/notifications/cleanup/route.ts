import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Notification from "@/lib/db/notificationModel";
import Perms from "@/lib/db/permissionsModel";
import dbConnect from "@/lib/db/connect";

const NOTIFICATION_MAX_AGE_DAYS = 30;

function verifyCronSecret(request: NextRequest): boolean {
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;
	if (!cronSecret || cronSecret.length < 16) return false;
	return authHeader === `Bearer ${cronSecret}`;
}

async function runCleanup() {
	await dbConnect();

	const now = new Date();
	const deletedCount = { total: 0, afterRead: 0, byAge: 0 };

	// 1. Delete notifications with shouldDeleteAfterRead that have been read past deleteAfterHours
	const readBased = await Notification.find({
		shouldDeleteAfterRead: true,
		readAt: { $exists: true, $ne: {} },
	});

	for (const notification of readBased) {
		let shouldDelete = false;
		const readAtMap = notification.readAt as Record<string, Date>;
		if (readAtMap && typeof readAtMap === "object") {
			for (const readAt of Object.values(readAtMap)) {
				if (readAt) {
					const deleteTime = new Date(readAt);
					deleteTime.setHours(deleteTime.getHours() + (notification.deleteAfterHours || 24));
					if (now >= deleteTime) {
						shouldDelete = true;
						break;
					}
				}
			}
		}
		if (shouldDelete) {
			await Notification.findByIdAndDelete(notification._id);
			deletedCount.afterRead++;
			deletedCount.total++;
		}
	}

	// 2. Delete all notifications older than NOTIFICATION_MAX_AGE_DAYS
	const cutoff = new Date(now);
	cutoff.setDate(cutoff.getDate() - NOTIFICATION_MAX_AGE_DAYS);
	const oldNotifications = await Notification.find({ createdAt: { $lt: cutoff } });
	for (const n of oldNotifications) {
		await Notification.findByIdAndDelete(n._id);
		deletedCount.byAge++;
		deletedCount.total++;
	}

	return { success: true, deleted: deletedCount };
}

export async function GET(request: NextRequest) {
	if (!verifyCronSecret(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	try {
		const result = await runCleanup();
		return NextResponse.json(result);
	} catch (error) {
		console.error("Error cleaning up notifications:", error);
		return NextResponse.json({ error: "Error cleaning up notifications" }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	// Allow: (1) Vercel cron with CRON_SECRET, or (2) authenticated Root user
	const hasCronSecret = verifyCronSecret(request);
	if (!hasCronSecret) {
		const user = await currentUser();
		if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		await dbConnect();
		const perms = await Perms.findOne({ userID: user.id });
		if (perms?.perms !== "Root") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
	}
	try {
		const result = await runCleanup();
		return NextResponse.json(result);
	} catch (error) {
		console.error("Error cleaning up notifications:", error);
		return NextResponse.json({ error: "Error cleaning up notifications" }, { status: 500 });
	}
}
