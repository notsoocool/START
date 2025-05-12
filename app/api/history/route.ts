import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import History from "@/lib/db/historyModel";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
	await dbConnect();

	try {
		const user = await currentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "20");
		const skip = (page - 1) * limit;

		const [history, total] = await Promise.all([History.find().sort({ timestamp: -1 }).skip(skip).limit(limit), History.countDocuments()]);

		return NextResponse.json({
			history,
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("Error fetching history:", error);
		return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
	}
}
