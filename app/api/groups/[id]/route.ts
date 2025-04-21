import { NextResponse } from "next/server";
import Group from "@/lib/db/groupModel";
import dbConnect from "@/lib/db/connect";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
	try {
		await dbConnect();
		const data = await request.json();
		const group = await Group.findByIdAndUpdate(params.id, data, { new: true });
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
