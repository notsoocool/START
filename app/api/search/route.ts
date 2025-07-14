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

		const LIMIT = 20;
		// Split query into terms (by whitespace)
		const terms = query.trim().split(/\s+/);

		// Build $or for all fields to search in Analysis
		const analysisFields = ["word", "sandhied_word", "kaaraka_sambandha", "morph_analysis", "morph_in_context", "possible_relations"];

		// For each term, require it to be present in ANY field (AND across terms, OR across fields)
		const analysisAndConditions = terms.map((term) => ({
			$or: analysisFields.map((field) => ({ [field]: { $regex: term, $options: "i" } })),
		}));

		// Find all analysis entries matching ALL terms in ANY field
		const analysisResults = await Analysis.find({ $and: analysisAndConditions })
			.select("book part1 part2 chaptno slokano")
			.limit(LIMIT * 2); // Fetch more to deduplicate later

		// Build unique keys for shloka lookup
		const shlokaKeys = analysisResults.map((result) => ({
			book: result.book,
			part1: result.part1,
			part2: result.part2,
			chaptno: result.chaptno,
			slokano: result.slokano,
		}));

		// Batch fetch shlokas for these keys
		let shlokaMap = new Map();
		if (shlokaKeys.length > 0) {
			const shlokaOr = shlokaKeys.map((k) => ({
				book: k.book,
				part1: k.part1,
				part2: k.part2,
				chaptno: k.chaptno,
				slokano: k.slokano,
			}));
			const shlokas = await Shloka.find({ $or: shlokaOr })
				.select("_id spart book part1 part2 chaptno slokano")
				.limit(LIMIT * 2);
			for (const shloka of shlokas) {
				const key = `${shloka.book}-${shloka.part1 || ""}-${shloka.part2 || ""}-${shloka.chaptno}-${shloka.slokano}`;
				shlokaMap.set(key, shloka);
			}
		}

		// Combine and deduplicate results, only include those with a shloka
		const combinedResults = [];
		const seen = new Set();
		for (const result of analysisResults) {
			const key = `${result.book}-${result.part1 || ""}-${result.part2 || ""}-${result.chaptno}-${result.slokano}`;
			if (!seen.has(key) && shlokaMap.has(key)) {
				const shloka = shlokaMap.get(key);
				combinedResults.push({
					_id: shloka._id,
					book: result.book,
					part1: result.part1,
					part2: result.part2,
					chaptno: result.chaptno,
					slokano: result.slokano,
					spart: shloka.spart,
				});
				seen.add(key);
			}
			if (combinedResults.length >= LIMIT) break;
		}

		// Also search in Shloka.spart for all terms (AND)
		const shlokaAndConditions = terms.map((term) => ({ spart: { $regex: term, $options: "i" } }));
		const shlokaResults = await Shloka.find({ $and: shlokaAndConditions }).select("_id book part1 part2 chaptno slokano spart").limit(LIMIT);

		// Add shloka results not already in combinedResults
		for (const result of shlokaResults) {
			const key = `${result.book}-${result.part1 || ""}-${result.part2 || ""}-${result.chaptno}-${result.slokano}`;
			if (!seen.has(key)) {
				combinedResults.push({
					_id: result._id,
					book: result.book,
					part1: result.part1,
					part2: result.part2,
					chaptno: result.chaptno,
					slokano: result.slokano,
					spart: result.spart,
				});
				seen.add(key);
				if (combinedResults.length >= LIMIT) break;
			}
		}

		return NextResponse.json(combinedResults);
	} catch (error) {
		console.error("Search error:", error);
		return NextResponse.json({ error: "Failed to perform search" }, { status: 500 });
	}
}
