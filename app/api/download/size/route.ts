import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import Shloka from "@/lib/db/newShlokaModel";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const book = searchParams.get("book");
		const part1 = searchParams.get("part1");
		const part2 = searchParams.get("part2");
		const chapter = searchParams.get("chapter");
		const slokano = searchParams.get("slokano");
		const dataType = searchParams.get("dataType") as "analysis" | "shloka" | "both";
		const analysisFields = searchParams.get("analysisFields")?.split(",") || [];
		const shlokaFields = searchParams.get("shlokaFields")?.split(",") || [];

		console.log("Size estimation request parameters:", {
			book,
			part1,
			part2,
			chapter,
			slokano,
			dataType,
			analysisFields,
			shlokaFields,
		});

		// Validate required parameters
		if (!book || !dataType) {
			return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
		}

		await dbConnect();

		let totalEstimatedSize = 0;
		let analysisCount = 0;
		let shlokaCount = 0;

		// Estimate analysis data size
		if (dataType === "analysis" || dataType === "both") {
			let analysisQuery: any = {};

			// Handle book selection
			if (book !== "all") {
				analysisQuery.book = book;
			}

			// Handle part1 selection
			if (part1 === "all" || part1 === "" || part1 === null) {
				// For "all" part1 or empty string, don't add to query - will match all part1 values
			} else if (part1 === "null") {
				analysisQuery.part1 = { $in: [null, ""] };
			} else if (part1) {
				analysisQuery.part1 = part1;
			}

			// Handle part2 selection
			if (part2 === "all" || part2 === "" || part2 === null) {
				// For "all" part2 or empty string, don't add to query - will match all part2 values
			} else if (part2 === "null") {
				analysisQuery.part2 = { $in: [null, ""] };
			} else if (part2) {
				analysisQuery.part2 = part2;
			}

			// Handle chapter selection
			if (chapter === "all" || chapter === "" || chapter === null) {
				// For "all" chapter or empty string, don't add to query - will match all chapter values
			} else if (chapter) {
				analysisQuery.chaptno = chapter;
			}

			if (slokano) {
				analysisQuery.slokano = slokano;
			}

			// Ensure we have at least one query criteria
			if (Object.keys(analysisQuery).length === 0) {
				analysisQuery.anvaya_no = { $exists: true };
			}

			analysisCount = await Analysis.countDocuments(analysisQuery);

			// Estimate size: each analysis record is roughly 500 bytes
			const analysisSize = analysisCount * 500;
			totalEstimatedSize += analysisSize;
		}

		// Estimate shloka data size
		if (dataType === "shloka" || dataType === "both") {
			let shlokaQuery: any = {};

			// Handle book selection
			if (book !== "all") {
				shlokaQuery.book = book;
			}

			// Handle part1 selection
			if (part1 === "all" || part1 === "" || part1 === null) {
				// For "all" part1 or empty string, don't add to query - will match all part1 values
			} else if (part1 === "null") {
				shlokaQuery.part1 = { $in: [null, ""] };
			} else if (part1) {
				shlokaQuery.part1 = part1;
			}

			// Handle part2 selection
			if (part2 === "all" || part2 === "" || part2 === null) {
				// For "all" part2 or empty string, don't add to query - will match all part2 values
			} else if (part2) {
				shlokaQuery.part2 = part2;
			}

			// Handle chapter selection
			if (chapter === "all" || chapter === "" || chapter === null) {
				// For "all" chapter or empty string, don't add to query - will match all chapter values
			} else if (chapter) {
				shlokaQuery.chaptno = chapter;
			}

			if (slokano) {
				shlokaQuery.slokano = slokano;
			}

			// Ensure we have at least one query criteria
			if (Object.keys(shlokaQuery).length === 0) {
				shlokaQuery.slokano = { $exists: true };
			}

			shlokaCount = await Shloka.countDocuments(shlokaQuery);

			// Estimate size: each shloka record is roughly 300 bytes
			const shlokaSize = shlokaCount * 300;
			totalEstimatedSize += shlokaSize;
		}

		// Add overhead for JSON structure
		totalEstimatedSize += 1000; // 1KB overhead

		console.log("Size estimation results:", {
			analysisCount,
			shlokaCount,
			totalEstimatedSize,
			totalEstimatedSizeMB: (totalEstimatedSize / (1024 * 1024)).toFixed(2),
		});

		return NextResponse.json({
			estimatedSize: totalEstimatedSize,
			analysisCount,
			shlokaCount,
			estimatedSizeMB: (totalEstimatedSize / (1024 * 1024)).toFixed(2),
		});
	} catch (error) {
		console.error("Size estimation error:", error);
		return NextResponse.json({ error: "Failed to estimate download size" }, { status: 500 });
	}
}
