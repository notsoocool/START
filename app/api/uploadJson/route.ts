import Shloka from "@/lib/db/newShlokaModel";
import Analysis from "@/lib/db/newAnalysisModel";
import dbConnect from "@/lib/db/connect";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { inheritPublishFlags } from "@/lib/books/inheritPublishFlags";

export async function POST(req: NextRequest) {
	await dbConnect();
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}
	const { book, part1, part2, shlokaData, analysisData } = await req.json();

	if (!book) {
		return NextResponse.json({ error: "Book is required to upload" }, { status: 400 });
	}

	if (!shlokaData || !analysisData) {
		return NextResponse.json({ error: "Both shlokaData and analysisData are required" }, { status: 400 });
	}

	try {
		const part1Val = part1 || null;
		const part2Val = part2 || null;
		const bookInherited = await inheritPublishFlags({
			book,
			part1: part1Val,
			part2: part2Val,
		});
		const flagsByChapter = new Map<string, typeof bookInherited>();

		const updatedShlokas = [];
		for (const shloka of shlokaData as any[]) {
			const chaptno = shloka?.chaptno != null ? String(shloka.chaptno) : "";
			let inherited = bookInherited;
			if (chaptno) {
				if (!flagsByChapter.has(chaptno)) {
					flagsByChapter.set(
						chaptno,
						await inheritPublishFlags({
							book,
							part1: part1Val,
							part2: part2Val,
							chaptno,
						})
					);
				}
				inherited = flagsByChapter.get(chaptno) || bookInherited;
			}
			updatedShlokas.push({
				...shloka,
				book,
				part1: part1Val,
				part2: part2Val,
				userPublished: inherited.userPublished,
				groupPublished: inherited.groupPublished,
				locked: inherited.locked,
				...(inherited.owner ? { owner: inherited.owner } : {}),
			});
		}

		const updatedAnalyses = analysisData.map((analysis: any) => ({
			...analysis,
			book,
			part1: part1Val,
			part2: part2Val,
		}));

		await Shloka.insertMany(updatedShlokas);
		await Analysis.insertMany(updatedAnalyses);

		return NextResponse.json({ success: true, message: "Data uploaded successfully" });
	} catch (error) {
		console.error(error);
		return NextResponse.json({ error: "Failed to upload data" }, { status: 500 });
	}
}
