import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import Discussion from "@/lib/db/discussionModel";
import Shloka from "@/lib/db/newShlokaModel";
import Notification from "@/lib/db/notificationModel";
import { currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";

export async function POST(req: NextRequest) {
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	try {
		const user = await currentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await req.json();
		await dbConnect();
		const discussion = await Discussion.create({
			...body,
			shlokaId: new mongoose.Types.ObjectId(body.shlokaId),
			userId: user.id,
			userName: `${user.firstName} ${user.lastName}`,
			content: body.message, // Map message to content field
		});

		await notifyAdminsOfComment(user.id, discussion.userName, String(body.message ?? ""), body.shlokaId);

		return NextResponse.json(discussion);
	} catch (error) {
		return NextResponse.json({ error: "Error creating discussion" }, { status: 500 });
	}
}

async function notifyAdminsOfComment(senderId: string, senderName: string, content: string, shlokaId: string) {
	try {
		if (!mongoose.isValidObjectId(shlokaId)) return;
		const shloka = await Shloka.findById(shlokaId).select("book part1 part2 chaptno slokano");
		if (!shloka) return;
		const preview = content.trim().replace(/\s+/g, " ").slice(0, 280);
		const place = `${shloka.book}, chapter ${shloka.chaptno}, shloka ${shloka.slokano}`;
		const part1 = shloka.part1 ? String(shloka.part1) : "null";
		const part2 = shloka.part2 ? String(shloka.part2) : "null";
		const link = `/books/${encodeURIComponent(shloka.book)}/${encodeURIComponent(part1)}/${encodeURIComponent(part2)}/${encodeURIComponent(shloka.chaptno)}/${shlokaId}`;

		await Notification.create({
			senderID: senderId,
			senderName,
			recipientID: "admins",
			recipientName: "Admins",
			subject: "New comment on an analysis",
			message: `${senderName} commented on ${place}.\n\n${preview}`,
			link,
			isFromUser: true,
			isErrorReport: false,
			readBy: [senderId],
		});
	} catch (error) {
		console.error("Error notifying admins of a comment:", error);
	}
}

export async function GET(req: Request) {
	try {
		const url = new URL(req.url);
		const shlokaId = url.searchParams.get("shlokaId");

		await dbConnect();
		const discussions = await Discussion.find({
			shlokaId: new mongoose.Types.ObjectId(shlokaId as string),
		}).sort({ createdAt: -1 });

		return NextResponse.json(discussions);
	} catch (error) {
		return NextResponse.json({ error: "Error fetching discussions" }, { status: 500 });
	}
}
