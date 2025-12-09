#!/usr/bin/env bun

import mongoose from "mongoose";
import Analysis from "@/lib/db/newAnalysisModel";
import dbConnect from "@/lib/db/connect";
import * as fs from "fs";
import * as path from "path";

interface TSVRow {
	anvaya_no: string;
	word: string;
	morph_in_context: string; // Not used for matching, just for reference
	telugu_meaning: string;
}

async function updateTeluguEnglishMeanings() {
	try {
		await dbConnect();
		console.log("Connected to database");

		// Configuration
		const BOOK = "अष्टाङ्गहृदयम्";
		const PART1 = null;
		const PART2 = null;
		const CHAPTER = "05";
		const TELUGU_LANG_CODE = "te";

		// Get TSV file path from command line argument or use default
		const tsvFilePath =
			process.argv[2] || path.join(process.cwd(), "meanings.tsv");

		if (!fs.existsSync(tsvFilePath)) {
			console.error(`TSV file not found at: ${tsvFilePath}`);
			console.error(
				"Usage: tsx scripts/updateTeluguEnglishMeanings.ts <path-to-tsv-file>"
			);
			process.exit(1);
		}

		console.log(`Reading TSV file from: ${tsvFilePath}`);

		// Read and parse TSV file
		const fileContent = fs.readFileSync(tsvFilePath, "utf-8");
		const lines = fileContent
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		const tsvData: TSVRow[] = [];
		let lineNumber = 0;

		for (const line of lines) {
			lineNumber++;
			// Skip header row if it exists
			if (
				lineNumber === 1 &&
				(line.toLowerCase().includes("no.") ||
					line.toLowerCase().includes("anvaya"))
			) {
				continue;
			}

			// Skip empty lines
			if (!line.trim()) {
				continue;
			}

			// Split by comma (CSV format)
			const parts = line.split(",");

			if (parts.length < 5) {
				// Try to handle cases where there might be fewer columns (empty values at the end)
				if (parts.length < 2) {
					console.warn(
						`Skipping line ${lineNumber}: Expected at least 2 columns, got ${parts.length}`
					);
					continue;
				}
				// Pad with empty strings if needed
				while (parts.length < 5) {
					parts.push("");
				}
			}

			// Skip first column (No.) and extract: anvaya_no, word, Morph In Context, telugu meaning
			const [, anvaya_no, word, morph_in_context, telugu_meaning] = parts;

			// Skip if anvaya_no or word is missing
			if (
				!anvaya_no ||
				!word ||
				anvaya_no.trim() === "" ||
				word.trim() === ""
			) {
				continue; // Silently skip empty rows
			}

			tsvData.push({
				anvaya_no: anvaya_no.trim(),
				word: word.trim(),
				morph_in_context: morph_in_context?.trim() || "",
				telugu_meaning: telugu_meaning?.trim() || "",
			});
		}

		console.log(`Parsed ${tsvData.length} rows from TSV file`);

		// Show sample of parsed data
		if (tsvData.length > 0) {
			console.log("\nSample of first 3 parsed rows:");
			tsvData.slice(0, 3).forEach((row, idx) => {
				console.log(
					`  ${idx + 1}. anvaya_no="${row.anvaya_no}", word="${
						row.word
					}", telugu="${row.telugu_meaning.substring(0, 30)}${
						row.telugu_meaning.length > 30 ? "..." : ""
					}"`
				);
			});
		}

		// Find all analysis records for the specified book/part/chapter
		const query = {
			book: BOOK,
			part1: PART1,
			part2: PART2,
			chaptno: CHAPTER,
		};

		console.log(`Querying database with:`, query);
		const allRecords = await Analysis.find(query).lean();

		console.log(`Found ${allRecords.length} total records in database`);

		let updatedCount = 0;
		let notFoundCount = 0;
		const notFoundRows: TSVRow[] = [];

		// Process each TSV row
		for (const tsvRow of tsvData) {
			// Find matching record by anvaya_no and word only
			const matchingRecord = allRecords.find(
				(record) =>
					record.anvaya_no?.trim() === tsvRow.anvaya_no &&
					record.word?.trim() === tsvRow.word
			);

			if (!matchingRecord) {
				notFoundCount++;
				notFoundRows.push(tsvRow);
				console.warn(
					`No match found for: anvaya_no="${tsvRow.anvaya_no}", word="${tsvRow.word}"`
				);
				continue;
			}

			// Skip if telugu_meaning is empty
			if (!tsvRow.telugu_meaning || tsvRow.telugu_meaning.trim() === "") {
				console.warn(
					`Skipping update for anvaya_no="${tsvRow.anvaya_no}", word="${tsvRow.word}": telugu_meaning is empty`
				);
				continue;
			}

			// Load the document (not lean) so we can work with Mongoose Map type
			const doc = await Analysis.findById(matchingRecord._id);
			if (!doc) {
				console.warn(`Document not found: ${matchingRecord._id}`);
				notFoundCount++;
				notFoundRows.push(tsvRow);
				continue;
			}

			// Get existing meanings Map or create new one
			// Mongoose Map is automatically available on the document
			if (!doc.meanings) {
				doc.meanings = new Map();
			}

			// Set Telugu meaning directly on the Map
			doc.meanings.set(TELUGU_LANG_CODE, tsvRow.telugu_meaning.trim());

			// Save the document - Mongoose will properly persist the Map
			await doc.save();

			updatedCount++;
			console.log(
				`✓ Updated record ${matchingRecord._id}: anvaya_no="${
					tsvRow.anvaya_no
				}", word="${
					tsvRow.word
				}", telugu_meaning="${tsvRow.telugu_meaning.substring(0, 50)}${
					tsvRow.telugu_meaning.length > 50 ? "..." : ""
				}"`
			);
		}

		// Summary
		console.log("\n=== Summary ===");
		console.log(`Total TSV rows: ${tsvData.length}`);
		console.log(`Successfully updated: ${updatedCount}`);
		console.log(`Not found: ${notFoundCount}`);

		if (notFoundRows.length > 0) {
			console.log("\n=== Rows not found in database ===");
			notFoundRows.forEach((row, index) => {
				console.log(
					`${index + 1}. anvaya_no="${row.anvaya_no}", word="${
						row.word
					}"`
				);
			});
		}
	} catch (error) {
		console.error("Error updating meanings:", error);
		throw error;
	} finally {
		await mongoose.connection.close();
		console.log("\nDatabase connection closed");
	}
}

// Run the update
updateTeluguEnglishMeanings()
	.then(() => {
		console.log("\nScript completed successfully");
		process.exit(0);
	})
	.catch((error) => {
		console.error("\nScript failed:", error);
		process.exit(1);
	});
