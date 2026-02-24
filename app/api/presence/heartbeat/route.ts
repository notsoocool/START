import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db/connect";
import Presence from "@/lib/db/presenceModel";

export async function POST() {
	const user = await currentUser();
	if (!user) {
		return NextResponse.json({ ok: false }, { status: 401 });
	}

	try {
		await dbConnect();
		await Presence.findOneAndUpdate(
			{ userID: user.id },
			{ lastActiveAt: new Date() },
			{ upsert: true, new: true }
		);
		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("Presence heartbeat error:", error);
		return NextResponse.json({ ok: false }, { status: 500 });
	}
}
