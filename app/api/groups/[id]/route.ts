import { NextResponse } from "next/server";
import Group from "@/lib/db/groupModel";
import dbConnect from "@/lib/db/connect";

export async function GET(request: Request, { params }: { params: { id: string } }) {
	try {
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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
	try {
		await dbConnect();
		const data = await request.json();
		const group = await Group.findByIdAndUpdate(params.id, data, { new: true });

		if (!group) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		// When Group A gets new books, propagate them to parent Group B(s)
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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
	try {
		await dbConnect();
		await Group.findByIdAndDelete(params.id);
		return NextResponse.json({ message: "Group deleted successfully" });
	} catch (error) {
		console.error("Error deleting group:", error);
		return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
	}
}
