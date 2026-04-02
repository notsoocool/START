import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import Shloka from "@/lib/db/newShlokaModel";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";

function normPart(v: unknown): string | null {
	if (v == null || v === "" || (typeof v === "string" && v.trim() === "")) return null;
	const s = String(v).trim();
	if (s === "null") return null;
	return s;
}

function scopeFilter(
	book: string,
	part1: string | null,
	part2: string | null,
	chaptno: string
): Record<string, unknown> {
	const q: Record<string, unknown> = { book, chaptno };
	if (part1 === null) q.part1 = null;
	else q.part1 = part1;
	if (part2 === null) q.part2 = null;
	else q.part2 = part2;
	return q;
}

export async function POST(req: NextRequest) {
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	try {
		await dbConnect();
		const body = await req.json();
		const book = typeof body.book === "string" ? body.book.trim() : "";
		const oldChaptno =
			typeof body.oldChaptno === "string" ? body.oldChaptno.trim() : "";
		const newChaptno =
			typeof body.newChaptno === "string" ? body.newChaptno.trim() : "";
		const part1 = normPart(body.part1);
		const part2 = normPart(body.part2);

		if (!book || !oldChaptno || !newChaptno) {
			return NextResponse.json(
				{ message: "book, oldChaptno, and newChaptno are required" },
				{ status: 400 }
			);
		}
		if (oldChaptno === newChaptno) {
			return NextResponse.json(
				{ message: "Old and new chapter numbers must differ" },
				{ status: 400 }
			);
		}

		const sourceFilter = scopeFilter(book, part1, part2, oldChaptno);
		const targetFilter = scopeFilter(book, part1, part2, newChaptno);

		const [shlokaSource, analysisSource, shlokaTarget, analysisTarget] =
			await Promise.all([
				Shloka.countDocuments(sourceFilter),
				Analysis.countDocuments(sourceFilter),
				Shloka.countDocuments(targetFilter),
				Analysis.countDocuments(targetFilter),
			]);

		if (shlokaSource === 0 && analysisSource === 0) {
			return NextResponse.json(
				{
					message:
						"No shloka or analysis rows matched this book / part1 / part2 / old chapter. Check spelling and use empty part fields for null.",
					shlokasMatched: 0,
					analysisMatched: 0,
				},
				{ status: 404 }
			);
		}

		if (shlokaTarget > 0 || analysisTarget > 0) {
			return NextResponse.json(
				{
					message:
						"Target chapter number already has data for this book and parts. Resolve the conflict before renaming.",
					shlokasInTarget: shlokaTarget,
					analysisRowsInTarget: analysisTarget,
				},
				{ status: 409 }
			);
		}

		const [shlokaResult, analysisResult] = await Promise.all([
			Shloka.updateMany(sourceFilter, { $set: { chaptno: newChaptno } }),
			Analysis.updateMany(sourceFilter, { $set: { chaptno: newChaptno } }),
		]);

		return NextResponse.json({
			message: "Chapter number updated",
			shlokasUpdated: shlokaResult.modifiedCount,
			analysisUpdated: analysisResult.modifiedCount,
		});
	} catch (error) {
		console.error("rename-chapter:", error);
		return NextResponse.json(
			{
				message: "Error renaming chapter",
				error: (error as Error).message,
			},
			{ status: 500 }
		);
	}
}
