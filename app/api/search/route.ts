import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import Shloka from "@/lib/db/newShlokaModel";

export async function GET(request: NextRequest) {
	await dbConnect();

	try {
		const { searchParams } = new URL(request.url);
		const query = searchParams.get("q");

		if (!query) {
			return NextResponse.json({ error: "Search query is required" }, { status: 400 });
		}

		// Split query into terms (by whitespace)
		const terms = query.trim().split(/\s+/);

		// Build $and array for Analysis model
		const analysisAndConditions = terms.map((term) => ({
			$or: [
				{ word: { $regex: term, $options: "i" } },
				{ sandhied_word: { $regex: term, $options: "i" } },
				{ kaaraka_sambandha: { $regex: term, $options: "i" } },
				{ morph_analysis: { $regex: term, $options: "i" } },
				{ morph_in_context: { $regex: term, $options: "i" } },
			],
		}));

		// Build $and array for Shloka model
		const shlokaAndConditions = terms.map((term) => ({
			spart: { $regex: term, $options: "i" },
		}));

		// Search in Analysis model
		const analysisResults = await Analysis.find({
			$and: analysisAndConditions,
		}).select("book part1 part2 chaptno slokano");

		// Search in Shloka model
		const shlokaResults = await Shloka.find({
			$and: shlokaAndConditions,
		}).select("_id book part1 part2 chaptno slokano spart");

		// Get corresponding shloka IDs for analysis results
		const shlokaIds = new Map();
		for (const result of analysisResults) {
			const shloka = await Shloka.findOne({
				book: result.book,
				part1: result.part1,
				part2: result.part2,
				chaptno: result.chaptno,
				slokano: result.slokano,
			}).select("_id spart");

			if (shloka) {
				const key = `${result.book}-${result.part1 || ""}-${result.part2 || ""}-${result.chaptno}-${result.slokano}`;
				shlokaIds.set(key, {
					_id: shloka._id,
					spart: shloka.spart,
				});
			}
		}

		// Combine and deduplicate results
		const combinedResults = new Map();

		// Add analysis results with corresponding shloka IDs
		analysisResults.forEach((result) => {
			const key = `${result.book}-${result.part1 || ""}-${result.part2 || ""}-${result.chaptno}-${result.slokano}`;
			const shlokaData = shlokaIds.get(key);
			if (shlokaData && !combinedResults.has(key)) {
				combinedResults.set(key, {
					_id: shlokaData._id,
					book: result.book,
					part1: result.part1,
					part2: result.part2,
					chaptno: result.chaptno,
					slokano: result.slokano,
					spart: shlokaData.spart,
				});
			}
		});

		// Add shloka results
		shlokaResults.forEach((result) => {
			const key = `${result.book}-${result.part1 || ""}-${result.part2 || ""}-${result.chaptno}-${result.slokano}`;
			if (!combinedResults.has(key)) {
				combinedResults.set(key, {
					_id: result._id,
					book: result.book,
					part1: result.part1,
					part2: result.part2,
					chaptno: result.chaptno,
					slokano: result.slokano,
					spart: result.spart,
				});
			}
		});

		return NextResponse.json(Array.from(combinedResults.values()));
	} catch (error) {
		console.error("Search error:", error);
		return NextResponse.json({ error: "Failed to perform search" }, { status: 500 });
	}
}
