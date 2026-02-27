import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import { runSanityCheck, type AnalysisRow } from "@/lib/sanityCheck";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json().catch(() => ({}));
		const { book, part1, part2, chaptno, data: inlineData } = body;

		let rows: AnalysisRow[];

		if (Array.isArray(inlineData) && inlineData.length > 0) {
			rows = inlineData;
		} else if (book) {
			await dbConnect();

			const analysisQuery: Record<string, unknown> = { book };

			if (part1 !== "all" && part1 !== "" && part1 != null) {
				if (part1 === "null") {
					analysisQuery.part1 = { $in: [null, ""] };
				} else {
					analysisQuery.part1 = part1;
				}
			}
			if (part2 !== "all" && part2 !== "" && part2 != null) {
				if (part2 === "null") {
					analysisQuery.part2 = { $in: [null, ""] };
				} else {
					analysisQuery.part2 = part2;
				}
			}
			if (chaptno && chaptno !== "all" && chaptno !== "") {
				analysisQuery.chaptno = chaptno;
			}

			const select =
				"anvaya_no word slokano sentno chaptno part1 part2 book morph_in_context kaaraka_sambandha possible_relations bgcolor";
			const docs = (await Analysis.find(analysisQuery)
				.select(select)
				.lean()) as AnalysisRow[];

			rows = docs;
		} else {
			return NextResponse.json(
				{ error: "Provide either { book, part1?, part2?, chaptno? } or { data: AnalysisRow[] }" },
				{ status: 400 }
			);
		}

		const result = runSanityCheck(rows);
		return NextResponse.json(result);
	} catch (err) {
		console.error("Sanity check error:", err);
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Sanity check failed" },
			{ status: 500 }
		);
	}
}
