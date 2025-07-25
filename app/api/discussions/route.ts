import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import Discussion from "@/lib/db/discussionModel";
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

		return NextResponse.json(discussion);
	} catch (error) {
		return NextResponse.json({ error: "Error creating discussion" }, { status: 500 });
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
