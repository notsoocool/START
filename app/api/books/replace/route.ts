import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import Shloka from "@/lib/db/newShlokaModel";

export async function POST(req: Request) {
	try {
		await dbConnect();
		const { oldBook, newBook } = await req.json();

		if (!oldBook || !newBook) {
			return NextResponse.json({ message: "Old book name and new book name are required" }, { status: 400 });
		}

		// Update book name in Analysis collection
		const analysisResult = await Analysis.updateMany({ book: oldBook }, { $set: { book: newBook } });

		// Update book name in Shloka collection
		const shlokaResult = await Shloka.updateMany({ book: oldBook }, { $set: { book: newBook } });

		return NextResponse.json({
			message: "Book name replaced successfully",
			analysisUpdated: analysisResult.modifiedCount,
			shlokasUpdated: shlokaResult.modifiedCount,
		});
	} catch (error) {
		console.error("Error replacing book name:", error);
		return NextResponse.json({ message: "Error replacing book name", error: (error as Error).message }, { status: 500 });
	}
}
