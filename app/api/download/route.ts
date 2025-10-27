import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import Shloka from "@/lib/db/newShlokaModel";

// Maximum timeout allowed on Vercel hobby plan
export const maxDuration = 60; // 60 seconds max

// Force dynamic route - required for API endpoints with query parameters
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = request.nextUrl;

		// Extract parameters
		const book = searchParams.get("book");
		const part1 = searchParams.get("part1");
		const part2 = searchParams.get("part2");
		const chapter = searchParams.get("chapter");
		const slokano = searchParams.get("slokano");
		const format = searchParams.get("format") || "json";
		const analysisFields =
			searchParams.get("analysisFields")?.split(",") || [];
		const shlokaFields = searchParams.get("shlokaFields")?.split(",") || [];
		const dataType = searchParams.get("dataType") || "analysis";

		console.log("Download request parameters:", {
			book,
			part1,
			part2,
			chapter,
			slokano,
			format,
			analysisFields,
			shlokaFields,
			dataType,
		});

		console.log("Parameter types and values:", {
			bookType: typeof book,
			part1Type: typeof part1,
			part2Type: typeof part2,
			chapterType: typeof chapter,
			bookLength: book?.length,
			part1Length: part1?.length,
			part2Length: part2?.length,
			chapterLength: chapter?.length,
		});

		// Validate required parameters
		if (!book) {
			return NextResponse.json(
				{ error: "Missing required parameter: book" },
				{ status: 400 }
			);
		}

		// For "all" book selection, no other parameters are required
		// For specific book selection, we need at least some level of specificity
		if (book !== "all") {
			// part1 can be "all", empty string, or specific value
			if (part1 === null || part1 === undefined) {
				return NextResponse.json(
					{ error: "Missing required parameter: part1" },
					{ status: 400 }
				);
			}

			// If part1 is not "all", check part2
			if (part1 !== "all" && part1 !== "") {
				if (part2 === null || part2 === undefined) {
					return NextResponse.json(
						{ error: "Missing required parameter: part2" },
						{ status: 400 }
					);
				}

				// If part2 is not "all", check chapter
				if (part2 !== "all" && part2 !== "") {
					if (chapter === null || chapter === undefined) {
						return NextResponse.json(
							{ error: "Missing required parameter: chapter" },
							{ status: 400 }
						);
					}
				}
			}
		}

		await dbConnect();

		let result: any = {};

		// Fetch analysis data if requested
		if (dataType === "analysis" || dataType === "both") {
			if (analysisFields.length === 0) {
				return NextResponse.json(
					{ error: "No analysis fields selected" },
					{ status: 400 }
				);
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

			console.log(
				"Final Analysis query:",
				JSON.stringify(analysisQuery, null, 2)
			);
			console.log("Query keys count:", Object.keys(analysisQuery).length);

			// First check total count without field selection
			const totalCount = await Analysis.countDocuments(analysisQuery);
			console.log(
				"Total documents matching query (before field selection):",
				totalCount
			);

			const analysisData = await Analysis.find(analysisQuery).select(
				analysisFields.join(" ")
			);
			console.log("Analysis results count:", analysisData.length);
			result.analysis = analysisData;
		}

		// Fetch shloka data if requested
		if (dataType === "shloka" || dataType === "both") {
			if (shlokaFields.length === 0) {
				return NextResponse.json(
					{ error: "No shloka fields selected" },
					{ status: 400 }
				);
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

			console.log(
				"Final Shloka query:",
				JSON.stringify(shlokaQuery, null, 2)
			);
			console.log(
				"Shloka Query keys count:",
				Object.keys(shlokaQuery).length
			);

			// First check total count without field selection
			const totalShlokaCount = await Shloka.countDocuments(shlokaQuery);
			console.log(
				"Total shloka documents matching query (before field selection):",
				totalShlokaCount
			);

			const shlokaData = await Shloka.find(shlokaQuery).select(
				shlokaFields.join(" ")
			);
			console.log("Shloka results count:", shlokaData.length);
			result.shloka = shlokaData;
		}

		// Set response headers based on format
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

		if (format === "csv") {
			// Convert to CSV - handle different data structures
			let csvData: string;

			console.log("Converting to CSV. Data structure:", {
				dataType,
				resultKeys: Object.keys(result),
				analysisLength: result.analysis?.length,
				shlokaLength: result.shloka?.length,
			});

			if (dataType === "both") {
				// For "both" data type, create separate CSV sections
				const analysisCSV =
					result.analysis && result.analysis.length > 0
						? convertToCSV(result.analysis)
						: "";
				const shlokaCSV =
					result.shloka && result.shloka.length > 0
						? convertToCSV(result.shloka)
						: "";

				console.log("CSV conversion results:", {
					analysisCSV: analysisCSV.length,
					shlokaCSV: shlokaCSV.length,
				});

				if (analysisCSV && shlokaCSV) {
					csvData = `=== ANALYSIS DATA ===\n${analysisCSV}\n\n=== SHLOKA DATA ===\n${shlokaCSV}`;
				} else if (analysisCSV) {
					csvData = analysisCSV;
				} else if (shlokaCSV) {
					csvData = shlokaCSV;
				} else {
					csvData = "";
				}
			} else if (dataType === "analysis") {
				// For analysis data type
				csvData = convertToCSV(result.analysis);
			} else if (dataType === "shloka") {
				// For shloka data type
				csvData = convertToCSV(result.shloka);
			} else {
				csvData = "";
			}

			console.log("Final CSV data length:", csvData.length);

			return new NextResponse(csvData, {
				headers: {
					"Content-Type": "text/csv",
					"Content-Disposition": `attachment; filename="${filename}"`,
				},
			});
		} else {
			// Return as JSON - handle different data structures
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
				},
			});
		}
	} catch (error) {
		console.error("Download error:", error);
		return NextResponse.json(
			{ error: "Failed to generate download" },
			{ status: 500 }
		);
	}
}

// Helper function to convert data to CSV format
function convertToCSV(data: any[]): string {
	if (!Array.isArray(data) || data.length === 0) {
		return "";
	}

	// Get headers from first object
	const headers = Object.keys(data[0]);

	// Debug: Log the first few records to see data structure
	console.log(
		"CSV conversion - First record sample:",
		JSON.stringify(data[0], null, 2)
	);
	console.log(
		"CSV conversion - Data types:",
		headers.map((header) => `${header}: ${typeof data[0][header]}`)
	);

	// Create CSV header row
	const csvHeader = headers.map((header) => `"${header}"`).join(",");

	// Create CSV data rows
	const csvRows = data.map((row) =>
		headers
			.map((header) => {
				const value = row[header];

				// Handle different data types properly
				let stringValue: string;

				if (value === null || value === undefined) {
					stringValue = "";
				} else if (typeof value === "object") {
					// Handle objects, arrays, etc.
					if (Array.isArray(value)) {
						stringValue = value.join("; ");
					} else if (value instanceof Date) {
						stringValue = value.toISOString();
					} else {
						// For other objects, try to get meaningful string representation
						try {
							stringValue = JSON.stringify(value);
						} catch {
							stringValue = String(value);
						}
					}
				} else if (typeof value === "boolean") {
					// Convert boolean to readable string
					stringValue = value ? "true" : "false";
				} else {
					// For strings, numbers, etc.
					stringValue = String(value);
				}

				// Handle values that might contain commas or quotes
				if (
					stringValue.includes(",") ||
					stringValue.includes('"') ||
					stringValue.includes("\n")
				) {
					return `"${stringValue.replace(/"/g, '""')}"`;
				}
				return `"${stringValue}"`;
			})
			.join(",")
	);

	// Combine header and rows
	return [csvHeader, ...csvRows].join("\n");
}
