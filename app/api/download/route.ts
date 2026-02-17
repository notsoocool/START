import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import Shloka from "@/lib/db/newShlokaModel";

// Maximum timeout allowed on Vercel hobby plan
export const maxDuration = 60; // 60 seconds max

// Force dynamic route - required for API endpoints with query parameters
export const dynamic = "force-dynamic";

// Helpers for padacchedah/anvaya computation (from analysis API logic)
function joinWordsWithHyphenRule(tokens: string[]): string {
	let output = "";
	for (const token of tokens) {
		const word = String(token ?? "").trim();
		if (!word) continue;
		if (output.endsWith("-")) {
			output += word;
		} else {
			output += (output ? " " : "") + word;
		}
	}
	return output;
}

function sortByAnvaya(a: { anvaya_no?: string }, b: { anvaya_no?: string }) {
	const [am, as] = String(a?.anvaya_no ?? "0.0")
		.split(".")
		.map((n) => parseInt(n, 10) || 0);
	const [bm, bs] = String(b?.anvaya_no ?? "0.0")
		.split(".")
		.map((n) => parseInt(n, 10) || 0);
	if (am !== bm) return am - bm;
	return as - bs;
}

function sortByPoem(a: { poem?: string }, b: { poem?: string }) {
	const ai = parseInt(String(a?.poem ?? "0"), 10) || 0;
	const bi = parseInt(String(b?.poem ?? "0"), 10) || 0;
	return ai - bi;
}

// Normalize part1/part2 for matching (e.g. "none", null, "" all mean "no part")
function normPart(v: string | null | undefined): string {
	const s = String(v ?? "").trim().toLowerCase();
	if (s === "none" || s === "null" || s === "") return "";
	return String(v ?? "").trim();
}

function analysisKey(row: {
	part1?: string | null;
	part2?: string | null;
	chaptno?: string;
	slokano?: string;
}) {
	const p1 = normPart(row.part1);
	const p2 = normPart(row.part2);
	const c = String(row.chaptno ?? "");
	const s = String(row.slokano ?? "");
	return `${p1}|${p2}|${c}|${s}`;
}

// Keep only requested fields in each record
function filterToFields<T extends Record<string, unknown>>(
	records: T[],
	fields: string[]
): Record<string, unknown>[] {
	if (fields.length === 0) return [];
	return records.map((r) => {
		const out: Record<string, unknown> = {};
		for (const k of fields) {
			if (k in r) out[k] = r[k];
		}
		return out;
	});
}

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

			// Padacchedah and anvaya are computed from Analysis, not stored
			const baseAnalysisFields = analysisFields.filter(
				(f) => f !== "padacchedah" && f !== "anvaya"
			);
			const analysisSelectStr =
				baseAnalysisFields.length > 0
					? baseAnalysisFields.join(" ")
					: "part1 part2 chaptno slokano";

			const analysisData = (await Analysis.find(analysisQuery)
				.select(analysisSelectStr)
				.lean()) as Record<string, unknown>[];

			const needsPadacchedah = analysisFields.includes("padacchedah");
			const needsAnvaya = analysisFields.includes("anvaya");

			if (needsPadacchedah || needsAnvaya) {
				// Fetch analysis rows with word/sentno/poem for computation
				const computeData = (await Analysis.find(analysisQuery)
					.select("part1 part2 chaptno slokano sentno anvaya_no poem word")
					.lean()) as {
					part1?: string | null;
					part2?: string | null;
					chaptno?: string;
					slokano?: string;
					sentno?: string;
					anvaya_no?: string;
					poem?: string;
					word?: string;
				}[];

				const analysisByKey = new Map<
					string,
					{ sentno: string; anvaya_no?: string; poem?: string; word?: string }[]
				>();
				for (const row of computeData) {
					const key = analysisKey(row);
					if (!analysisByKey.has(key)) analysisByKey.set(key, []);
					analysisByKey.get(key)!.push({
						sentno: String(row.sentno ?? ""),
						anvaya_no: row.anvaya_no,
						poem: row.poem,
						word: row.word,
					});
				}

				const padacchedahByKey = new Map<string, string[]>();
				const anvayaByKey = new Map<string, string[]>();

				for (const [key, rows] of Array.from(analysisByKey.entries())) {
					const grouped: Record<
						string,
						{ sentno: string; anvaya_no?: string; poem?: string; word?: string }[]
					> = {};
					for (const r of rows) {
						const k = String(r.sentno ?? "");
						if (!k) continue;
						if (!grouped[k]) grouped[k] = [];
						grouped[k].push(r);
					}
					const sentnos = Object.keys(grouped).sort(
						(a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0)
					);

					if (needsPadacchedah) {
						const padacchedah: string[] = [];
						for (const sentno of sentnos) {
							const group = grouped[sentno]
								.slice()
								.sort(sortByAnvaya);
							const words = group
								.map((r) => String(r?.word ?? "").trim())
								.filter((w) => w && w !== "-");
							padacchedah.push(joinWordsWithHyphenRule(words));
						}
						padacchedahByKey.set(key, padacchedah);
					}
					if (needsAnvaya) {
						const anvaya: string[] = [];
						for (const sentno of sentnos) {
							const group = grouped[sentno]
								.slice()
								.sort(sortByPoem);
							const words = group
								.map((r) => String(r?.word ?? "").trim())
								.filter((w) => w && w !== "-");
							anvaya.push(joinWordsWithHyphenRule(words));
						}
						anvayaByKey.set(key, anvaya);
					}
				}

				// Attach padacchedah/anvaya to each analysis record
				for (const row of analysisData) {
					const key = analysisKey(
						row as Parameters<typeof analysisKey>[0]
					);
					if (needsPadacchedah) {
						row.padacchedah = padacchedahByKey.get(key) ?? [];
					}
					if (needsAnvaya) {
						row.anvaya = anvayaByKey.get(key) ?? [];
					}
				}
			}

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

			let selectFields =
				shlokaFields.length > 0 ? shlokaFields.join(" ") : "_id";
			// When "both" with mergeable analysis fields, need part1/part2/chaptno/slokano for key
			if (
				dataType === "both" &&
				analysisFields.every(
					(f) => f === "padacchedah" || f === "anvaya"
				)
			) {
				selectFields = selectFields
					? `${selectFields} part1 part2 chaptno slokano`
					: "part1 part2 chaptno slokano";
			}

			const shlokaData = (await Shloka.find(shlokaQuery)
				.select(selectFields)
				.sort({ part1: 1, part2: 1, chaptno: 1, slokano: 1 })
				.lean()) as Record<string, unknown>[];

			console.log("Shloka results count:", shlokaData.length);
			result.shloka = shlokaData;
		}

		// When "both" with only shloka-level analysis fields (padacchedah/anvaya), merge into single table
		const analysisOnlyShlokaLevel =
			dataType === "both" &&
			analysisFields.length > 0 &&
			analysisFields.every(
				(f) => f === "padacchedah" || f === "anvaya"
			);

		if (
			analysisOnlyShlokaLevel &&
			result.shloka &&
			result.shloka.length > 0 &&
			result.analysis &&
			result.analysis.length > 0
		) {
			const padacchedahByKey = new Map<string, string[]>();
			const anvayaByKey = new Map<string, string[]>();
			for (const row of result.analysis as Record<string, unknown>[]) {
				const key = analysisKey(
					row as Parameters<typeof analysisKey>[0]
				);
				if (
					!padacchedahByKey.has(key) &&
					Array.isArray(row.padacchedah)
				) {
					padacchedahByKey.set(key, row.padacchedah as string[]);
				}
				if (!anvayaByKey.has(key) && Array.isArray(row.anvaya)) {
					anvayaByKey.set(key, row.anvaya as string[]);
				}
			}

			const af = analysisFields as string[];
			const allRequestedFields = [
				...af,
				...shlokaFields.filter((f) => !af.includes(f)),
			];
			const merged: Record<string, unknown>[] = [];

			for (const shloka of result.shloka as Record<string, unknown>[]) {
				const key = analysisKey(
					shloka as Parameters<typeof analysisKey>[0]
				);
				const out: Record<string, unknown> = {};
				for (const f of allRequestedFields) {
					if (f === "padacchedah") {
						out.padacchedah = padacchedahByKey.get(key) ?? [];
					} else if (f === "anvaya") {
						out.anvaya = anvayaByKey.get(key) ?? [];
					} else if (f in shloka) {
						out[f] = shloka[f];
					}
				}
				merged.push(out);
			}

			result.merged = merged;
		}

		// Filter analysis and shloka to only requested fields (when not using merged)
		if (!result.merged) {
			if (result.analysis) {
				result.analysis = filterToFields(
					result.analysis as Record<string, unknown>[],
					analysisFields
				);
			}
			if (result.shloka) {
				result.shloka = filterToFields(
					result.shloka as Record<string, unknown>[],
					shlokaFields
				);
			}
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
				hasMerged: !!result.merged,
				analysisLength: result.analysis?.length,
				shlokaLength: result.shloka?.length,
			});

			if (result.merged && result.merged.length > 0) {
				// Merged single table (both with only padacchedah/anvaya + shloka)
				csvData = convertToCSV(result.merged);
			} else if (dataType === "both") {
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
			let jsonResult: unknown;

			if (result.merged) {
				jsonResult = result.merged;
			} else if (dataType === "analysis") {
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
					} else if (
						value &&
						typeof (value as { toString?: () => string }).toString ===
							"function"
					) {
						// MongoDB ObjectId and similar - use toString for clean string
						const str = (value as { toString: () => string }).toString();
						stringValue =
							str !== "[object Object]" ? str : JSON.stringify(value);
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
