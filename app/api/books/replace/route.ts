import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import Shloka from "@/lib/db/newShlokaModel";
import Group from "@/lib/db/groupModel";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";

export async function POST(req: NextRequest) {
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	try {
		await dbConnect();
		const { oldBook, newBook } = await req.json();

		if (!oldBook || !newBook) {
			return NextResponse.json({ message: "Old book name and new book name are required" }, { status: 400 });
		}
		if (oldBook === newBook) {
			return NextResponse.json({ message: "Old and new book names must differ" }, { status: 400 });
		}

		// Update book name in Analysis collection
		const analysisResult = await Analysis.updateMany({ book: oldBook }, { $set: { book: newBook } });

		// Update book name in Shloka collection
		const shlokaResult = await Shloka.updateMany({ book: oldBook }, { $set: { book: newBook } });

		// Keep Group.assignedBooks in sync (Group A + denormalized copies on Group B); access checks use these strings.
		const groupsWithOld = await Group.find({ assignedBooks: oldBook });
		let groupsUpdated = 0;
		for (const group of groupsWithOld) {
			const nextBooks = Array.from(
				new Set(group.assignedBooks.map((b: string) => (b === oldBook ? newBook : b)))
			);
			group.assignedBooks = nextBooks;
			await group.save();
			groupsUpdated += 1;
		}

		return NextResponse.json({
			message: "Book name replaced successfully",
			analysisUpdated: analysisResult.modifiedCount,
			shlokasUpdated: shlokaResult.modifiedCount,
			groupsUpdated,
		});
	} catch (error) {
		console.error("Error replacing book name:", error);
		return NextResponse.json({ message: "Error replacing book name", error: (error as Error).message }, { status: 500 });
	}
}
