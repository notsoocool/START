import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Group from "@/lib/db/groupModel";

export async function GET() {
	try {
		await dbConnect();
		console.log("Database connected successfully");

		// Fetch groups and populate the supervisedGroups field for Group B
		const groups = await Group.find({})
			.populate({
				path: "supervisedGroups",
				select: "name type members assignedBooks",
			})
			.lean();

		console.log("Fetched groups from database:", groups);

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

export async function POST(request: Request) {
	try {
		await dbConnect();
		const data = await request.json();

		// Validate that members is an array
		if (!Array.isArray(data.members)) {
			return NextResponse.json({ error: "Members must be an array" }, { status: 400 });
		}

		// For Group B, validate supervisedGroups and collect their books
		let assignedBooks = data.assignedBooks || [];
		if (data.type === "B" && data.supervisedGroups) {
			if (!Array.isArray(data.supervisedGroups)) {
				return NextResponse.json({ error: "Supervised groups must be an array" }, { status: 400 });
			}
			// Verify that supervised groups are actually Group A
			const supervisedGroups = await Group.find({ _id: { $in: data.supervisedGroups } });
			const invalidGroups = supervisedGroups.filter((group) => group.type !== "A");
			if (invalidGroups.length > 0) {
				return NextResponse.json({ error: "Can only supervise Group A (Annotator) groups" }, { status: 400 });
			}
			// Collect all books from supervised groups
			assignedBooks = Array.from(new Set(supervisedGroups.flatMap((group) => group.assignedBooks)));
		}

		// Create the group with the member IDs
		const group = new Group({
			...data,
			members: data.members,
			supervisedGroups: data.type === "B" ? data.supervisedGroups : undefined,
			assignedBooks: assignedBooks,
		});

		await group.save();
		return NextResponse.json(group);
	} catch (error) {
		console.error("Error creating group:", error);
		return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create group" }, { status: 500 });
	}
}
