import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Discussion from "@/lib/db/discussionModel";
import { currentUser } from "@clerk/nextjs/server";


export async function DELETE(req: Request, { params }: { params: { id: string } }) {
	try {
		const user = await currentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await dbConnect();
		const discussion = await Discussion.findById(params.id);

		if (!discussion) {
			return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
		}

		if (discussion.userId !== user.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await Discussion.findByIdAndDelete(params.id);
		return NextResponse.json({ message: "Discussion deleted successfully" });
	} catch (error) {
		return NextResponse.json({ error: "Error deleting discussion" }, { status: 500 });
	}
}
