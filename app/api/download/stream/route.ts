import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import Shloka from "@/lib/db/newShlokaModel";

// Maximum timeout allowed on Vercel hobby plan
export const maxDuration = 60; // 60 seconds max

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const book = searchParams.get("book");
		const part1 = searchParams.get("part1");
		const part2 = searchParams.get("part2");
		const chapter = searchParams.get("chapter");
		const slokano = searchParams.get("slokano");
		const format = searchParams.get("format") || "json";
		const dataType = searchParams.get("dataType") as
			| "analysis"
			| "shloka"
			| "both";
		const analysisFields =
			searchParams.get("analysisFields")?.split(",") || [];
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
			return NextResponse.json(
				{ error: "Missing required parameters" },
				{ status: 400 }
			);
		}

		await dbConnect();

		// Create ReadableStream for actual streaming
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();

				try {
					// Write opening bracket
					controller.enqueue(
						encoder.encode(
							dataType === "both" ? '{"analysis":[' : "["
						)
					);

					// Fetch and stream analysis data
					if (dataType === "analysis" || dataType === "both") {
						if (analysisFields.length === 0) {
							controller.error(
								new Error("No analysis fields selected")
							);
							return;
						}

						let analysisQuery: any = {};

						// Handle book selection
						if (book !== "all") {
							analysisQuery.book = book;
						}

						// Handle part1 selection
						if (part1 === "all" || part1 === "" || part1 === null) {
							// For "all" part1 or empty string, don't add to query
						} else if (part1 === "null") {
							analysisQuery.part1 = { $in: [null, ""] };
						} else if (part1) {
							analysisQuery.part1 = part1;
						}

						// Handle part2 selection
						if (part2 === "all" || part2 === "" || part2 === null) {
							// For "all" part2 or empty string, don't add to query
						} else if (part2 === "null") {
							analysisQuery.part2 = { $in: [null, ""] };
						} else if (part2) {
							analysisQuery.part2 = part2;
						}

						// Handle chapter selection
						if (
							chapter === "all" ||
							chapter === "" ||
							chapter === null
						) {
							// For "all" chapter or empty string, don't add to query
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

						// Stream data using cursor
						const cursor = Analysis.find(analysisQuery)
							.select(analysisFields.join(" "))
							.lean()
							.cursor();
						let isFirst = true;

						for (
							let doc = await cursor.next();
							doc != null;
							doc = await cursor.next()
						) {
							if (!isFirst) {
								controller.enqueue(encoder.encode(","));
							}
							controller.enqueue(
								encoder.encode(JSON.stringify(doc))
							);
							isFirst = false;
						}

						// Close analysis array
						controller.enqueue(encoder.encode("]"));

						// If "both" data type, add shloka data
						if (dataType === "both") {
							controller.enqueue(encoder.encode(',"shloka":['));

							// Stream shloka data
							if (shlokaFields.length === 0) {
								controller.error(
									new Error("No shloka fields selected")
								);
								return;
							}

							let shlokaQuery: any = {};

							if (book !== "all") {
								shlokaQuery.book = book;
							}

							if (
								part1 === "all" ||
								part1 === "" ||
								part1 === null
							) {
								// For "all" part1
							} else if (part1 === "null") {
								shlokaQuery.part1 = { $in: [null, ""] };
							} else if (part1) {
								shlokaQuery.part1 = part1;
							}

							if (
								part2 === "all" ||
								part2 === "" ||
								part2 === null
							) {
								// For "all" part2
							} else if (part2 === "null") {
								shlokaQuery.part2 = { $in: [null, ""] };
							} else if (part2) {
								shlokaQuery.part2 = part2;
							}

							if (
								chapter === "all" ||
								chapter === "" ||
								chapter === null
							) {
								// For "all" chapter
							} else if (chapter) {
								shlokaQuery.chaptno = chapter;
							}

							if (slokano) {
								shlokaQuery.slokano = slokano;
							}

							if (Object.keys(shlokaQuery).length === 0) {
								shlokaQuery.slokano = { $exists: true };
							}

							const shlokaCursor = Shloka.find(shlokaQuery)
								.select(shlokaFields.join(" "))
								.lean()
								.cursor();
							isFirst = true;

							for (
								let doc = await shlokaCursor.next();
								doc != null;
								doc = await shlokaCursor.next()
							) {
								if (!isFirst) {
									controller.enqueue(encoder.encode(","));
								}
								controller.enqueue(
									encoder.encode(JSON.stringify(doc))
								);
								isFirst = false;
							}

							controller.enqueue(encoder.encode("]"));
						}

						// Close final object
						if (dataType === "both") {
							controller.enqueue(encoder.encode("}"));
						} else {
							controller.enqueue(encoder.encode("]"));
						}
					}

					// Fetch and stream shloka data (if analysis not requested)
					else if (dataType === "shloka") {
						if (shlokaFields.length === 0) {
							controller.error(
								new Error("No shloka fields selected")
							);
							return;
						}

						let shlokaQuery: any = {};

						if (book !== "all") {
							shlokaQuery.book = book;
						}

						if (part1 === "all" || part1 === "" || part1 === null) {
							// For "all" part1
						} else if (part1 === "null") {
							shlokaQuery.part1 = { $in: [null, ""] };
						} else if (part1) {
							shlokaQuery.part1 = part1;
						}

						if (part2 === "all" || part2 === "" || part2 === null) {
							// For "all" part2
						} else if (part2 === "null") {
							shlokaQuery.part2 = { $in: [null, ""] };
						} else if (part2) {
							shlokaQuery.part2 = part2;
						}

						if (
							chapter === "all" ||
							chapter === "" ||
							chapter === null
						) {
							// For "all" chapter
						} else if (chapter) {
							shlokaQuery.chaptno = chapter;
						}

						if (slokano) {
							shlokaQuery.slokano = slokano;
						}

						if (Object.keys(shlokaQuery).length === 0) {
							shlokaQuery.slokano = { $exists: true };
						}

						const cursor = Shloka.find(shlokaQuery)
							.select(shlokaFields.join(" "))
							.lean()
							.cursor();
						let isFirst = true;

						for (
							let doc = await cursor.next();
							doc != null;
							doc = await cursor.next()
						) {
							if (!isFirst) {
								controller.enqueue(encoder.encode(","));
							}
							controller.enqueue(
								encoder.encode(JSON.stringify(doc))
							);
							isFirst = false;
						}

						controller.enqueue(encoder.encode("]"));
					}

					controller.close();
				} catch (error) {
					console.error("Stream error:", error);
					controller.error(error);
				}
			},
		});

		// Set response headers
		const safeBook =
			book === "all"
				? "all_books"
				: (book || "").replace(/[^\x00-\x7F]/g, "_");
		const safePart1 =
			part1 === "all"
				? "all_parts"
				: part1 === "null"
				? "null"
				: (part1 || "").replace(/[^\x00-\x7F]/g, "_");
		const safePart2 =
			part2 === "all"
				? "all_parts"
				: part2 === "null"
				? "null"
				: (part2 || "").replace(/[^\x00-\x7F]/g, "_");
		const safeChapter =
			chapter === "all"
				? "all_chapters"
				: (chapter || "").replace(/[^\x00-\x7F]/g, "_");
		const filename = `data_${safeBook}_${safePart1}_${safePart2}_${safeChapter}${
			slokano ? `_${slokano}` : ""
		}.${format}`;

		return new Response(stream, {
			headers: {
				"Content-Type": "application/json",
				"Content-Disposition": `attachment; filename="${filename}"`,
				"Cache-Control": "no-cache",
				"X-Download-ID": downloadId || "",
			},
		});
	} catch (error) {
		console.error("Streaming download error:", error);
		return NextResponse.json(
			{ error: "Failed to generate streaming download" },
			{ status: 500 }
		);
	}
}
