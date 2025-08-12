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
		const format = searchParams.get("format") || "json";
		const dataType = searchParams.get("dataType") as "analysis" | "shloka" | "both";
		const analysisFields = searchParams.get("analysisFields")?.split(",") || [];
		const shlokaFields = searchParams.get("shlokaFields")?.split(",") || [];
		const downloadId = searchParams.get("downloadId");

		console.log("Streaming download request parameters:", {
			book,
			part1,
			part2,
			chapter,
			slokano,
			format,
			dataType,
			analysisFields,
			shlokaFields,
			downloadId,
		});

		// Validate required parameters
		if (!book || !dataType) {
			return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
		}

		await dbConnect();

		const result: any = {};

		// Fetch analysis data if requested
		if (dataType === "analysis" || dataType === "both") {
			if (analysisFields.length === 0) {
				return NextResponse.json({ error: "No analysis fields selected" }, { status: 400 });
			}

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

			console.log("Streaming Analysis query:", JSON.stringify(analysisQuery, null, 2));

			// Use cursor for memory-efficient streaming
			const analysisCursor = Analysis.find(analysisQuery).select(analysisFields.join(" ")).cursor();
			const analysisData: any[] = [];

			for (let doc = await analysisCursor.next(); doc != null; doc = await analysisCursor.next()) {
				analysisData.push(doc);
			}

			console.log("Streaming Analysis results count:", analysisData.length);
			result.analysis = analysisData;
		}

		// Fetch shloka data if requested
		if (dataType === "shloka" || dataType === "both") {
			if (shlokaFields.length === 0) {
				return NextResponse.json({ error: "No shloka fields selected" }, { status: 400 });
			}

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
			} else if (part2 === "null") {
				shlokaQuery.part2 = { $in: [null, ""] };
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

			console.log("Streaming Shloka query:", JSON.stringify(shlokaQuery, null, 2));

			// Use cursor for memory-efficient streaming
			const shlokaCursor = Shloka.find(shlokaQuery).select(shlokaFields.join(" ")).cursor();
			const shlokaData: any[] = [];

			for (let doc = await shlokaCursor.next(); doc != null; doc = await shlokaCursor.next()) {
				shlokaData.push(doc);
			}

			console.log("Streaming Shloka results count:", shlokaData.length);
			result.shloka = shlokaData;
		}

		// Set response headers based on format
		const safeBook = book === "all" ? "all_books" : (book || "").replace(/[^\x00-\x7F]/g, "_");
		const safePart1 = part1 === "all" ? "all_parts" : part1 === "null" ? "null" : (part1 || "").replace(/[^\x00-\x7F]/g, "_");
		const safePart2 = part2 === "all" ? "all_parts" : part2 === "null" ? "null" : (part2 || "").replace(/[^\x00-\x7F]/g, "_");
		const safeChapter = chapter === "all" ? "all_chapters" : (chapter || "").replace(/[^\x00-\x7F]/g, "_");

		const filename = `data_${safeBook}_${safePart1}_${safePart2}_${safeChapter}${slokano ? `_${slokano}` : ""}.${format}`;

		// Return as JSON with streaming headers
		let jsonResult: any;

		if (dataType === "analysis") {
			jsonResult = result.analysis;
		} else if (dataType === "shloka") {
			jsonResult = result.shloka;
		} else {
			jsonResult = result; // Keep the "both" structure
		}

		return NextResponse.json(jsonResult, {
			headers: {
				"Content-Disposition": `attachment; filename="${filename}"`,
				"Content-Type": "application/json",
				"Cache-Control": "no-cache",
				"X-Download-ID": downloadId || "",
			},
		});
	} catch (error) {
		console.error("Streaming download error:", error);
		return NextResponse.json({ error: "Failed to generate streaming download" }, { status: 500 });
	}
}
