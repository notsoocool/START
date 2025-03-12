import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Discussion from "@/lib/db/discussionModel";
import { currentUser } from "@clerk/nextjs/server";
import Perms from "@/lib/db/permissionsModel";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
	try {
		await dbConnect();
		const user = await currentUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const discussion = await Discussion.findById(params.id);
		if (!discussion) {
			return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
		}

		// Get user permissions from the database
		const userPermissions = await Perms.findOne({ userID: user.id });
		if (!userPermissions) {
			return NextResponse.json({ error: "User permissions not found" }, { status: 404 });
		}

		// Allow deletion if user is owner OR has Admin/Root permissions
		if (discussion.userId !== user.id && !userPermissions.perms.includes("Admin") && !userPermissions.perms.includes("Root")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await Discussion.findByIdAndDelete(params.id);
		return NextResponse.json({ message: "Discussion deleted successfully" });
	} catch (error) {
		console.error("Delete discussion error:", error);
		return NextResponse.json({ error: "Error deleting discussion" }, { status: 500 });
	}
}
