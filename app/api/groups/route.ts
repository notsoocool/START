import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Group from "@/lib/db/groupModel";
import { logUsageHistory } from "@/lib/utils/usageHistoryLogger";
import { requirePerms } from "@/lib/auth/requirePerms";

export async function GET(request: NextRequest) {
	try {
		const auth = await requirePerms(
			["User", "Annotator", "Editor", "Admin", "Root", "Developer"],
			request
		);
		if (auth instanceof NextResponse) return auth;

		await dbConnect();

		const groups = await Group.find({})
			.populate({
				path: "supervisedGroups",
				select: "name type members assignedBooks",
			})
			.lean();

		if (!Array.isArray(groups)) {
			console.error("Invalid groups data from database:", groups);
			return NextResponse.json({ error: "Invalid groups data format" }, { status: 500 });
		}

		return NextResponse.json(groups);
	} catch (error) {
		console.error("Error in GET /api/groups:", error);
		return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const auth = await requirePerms(["Admin", "Root"], request);
		if (auth instanceof NextResponse) return auth;

		await dbConnect();
		const data = await request.json();

		if (!Array.isArray(data.members)) {
			return NextResponse.json({ error: "Members must be an array" }, { status: 400 });
		}

		let assignedBooks = data.assignedBooks || [];
		if (data.type === "B" && data.supervisedGroups) {
			if (!Array.isArray(data.supervisedGroups)) {
				return NextResponse.json({ error: "Supervised groups must be an array" }, { status: 400 });
			}
			const supervisedGroups = await Group.find({ _id: { $in: data.supervisedGroups } });
			const invalidGroups = supervisedGroups.filter((group) => group.type !== "A");
			if (invalidGroups.length > 0) {
				return NextResponse.json({ error: "Can only supervise Group A (Annotator) groups" }, { status: 400 });
			}
			assignedBooks = Array.from(new Set(supervisedGroups.flatMap((group) => group.assignedBooks)));
		}

		const group = new Group({
			...data,
			members: data.members,
			supervisedGroups: data.type === "B" ? data.supervisedGroups : undefined,
			assignedBooks: assignedBooks,
		});

		await group.save();
		await logUsageHistory("group_create", {
			groupId: group._id,
			name: group.name,
			type: group.type,
			members: group.members,
			assignedBooks: group.assignedBooks,
			by: auth.userId,
		});
		return NextResponse.json(group);
	} catch (error) {
		console.error("Error creating group:", error);
		return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create group" }, { status: 500 });
	}
}
