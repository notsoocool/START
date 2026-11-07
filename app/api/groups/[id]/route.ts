import { NextRequest, NextResponse } from "next/server";
import Group from "@/lib/db/groupModel";
import dbConnect from "@/lib/db/connect";
import { logUsageHistory } from "@/lib/utils/usageHistoryLogger";
import { requirePerms } from "@/lib/auth/requirePerms";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const auth = await requirePerms(
			["User", "Annotator", "Editor", "Admin", "Root", "Developer"],
			request
		);
		if (auth instanceof NextResponse) return auth;

		await dbConnect();
		const group = await Group.findById(params.id);

		if (!group) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		return NextResponse.json(group);
	} catch (error) {
		console.error("Error fetching group:", error);
		return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
	}
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const auth = await requirePerms(["Admin", "Root"], request);
		if (auth instanceof NextResponse) return auth;

		await dbConnect();
		const data = await request.json();
		const oldGroup = await Group.findById(params.id);
		if (!oldGroup) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		// Never persist college-lead fields if a stale client sends them
		delete data.leadIds;

		const group = await Group.findByIdAndUpdate(params.id, data, { new: true });

		if (!group) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		await logUsageHistory("group_update", {
			groupId: group._id,
			name: group.name,
			changes: Object.keys(data),
			oldMembers: oldGroup?.members,
			newMembers: data.members ?? group.members,
			by: auth.userId,
		});

		if (group.type === "A" && data.assignedBooks) {
			const parentGroupBs = await Group.find({
				type: "B",
				supervisedGroups: group._id,
			});

			for (const parentB of parentGroupBs) {
				const mergedBooks = Array.from(
					new Set([...(parentB.assignedBooks || []), ...data.assignedBooks])
				);
				await Group.findByIdAndUpdate(parentB._id, {
					assignedBooks: mergedBooks,
				});
			}
		}

		return NextResponse.json(group);
	} catch (error) {
		console.error("Error updating group:", error);
		return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
	}
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const auth = await requirePerms(["Admin", "Root"], request);
		if (auth instanceof NextResponse) return auth;

		await dbConnect();
		const group = await Group.findById(params.id);
		await Group.findByIdAndDelete(params.id);
		if (group) {
			await logUsageHistory("group_delete", {
				groupId: group._id,
				name: group.name,
				type: group.type,
				by: auth.userId,
			});
		}
		return NextResponse.json({ message: "Group deleted successfully" });
	} catch (error) {
		console.error("Error deleting group:", error);
		return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
	}
}
