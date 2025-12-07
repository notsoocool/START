#!/usr/bin/env bun

import mongoose from "mongoose";
import Analysis from "@/lib/db/newAnalysisModel";
import dbConnect from "@/lib/db/connect";
import * as fs from "fs";
import * as path from "path";

interface TSVRow {
	word: string;
	morph_in_context: string;
	telugu_meaning: string;
	english_meaning: string;
}

async function updateTeluguEnglishMeanings() {
	try {
		await dbConnect();
		console.log("Connected to database");

		// Configuration
		const BOOK = "अष्टाङ्गहृदयम्";
		const PART1 = null;
		const PART2 = null;
		const CHAPTER = "01";
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
			// Split by tab
			const parts = line.split("\t");

			if (parts.length < 4) {
				console.warn(
					`Skipping line ${lineNumber}: Expected 4 columns (word, morph_in_context, telugu_meaning, english_meaning), got ${parts.length}`
				);
				continue;
			}

			const [word, morph_in_context, telugu_meaning, english_meaning] = parts;

			if (!word || !morph_in_context) {
				console.warn(
					`Skipping line ${lineNumber}: Missing word or morph_in_context`
				);
				continue;
			}

			tsvData.push({
				word: word.trim(),
				morph_in_context: morph_in_context.trim(),
				telugu_meaning: telugu_meaning?.trim() || "",
				english_meaning: english_meaning?.trim() || "",
			});
		}

		console.log(`Parsed ${tsvData.length} rows from TSV file`);

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
			// Find matching record by word and morph_in_context
			const matchingRecord = allRecords.find(
				(record) =>
					record.word?.trim() === tsvRow.word &&
					record.morph_in_context?.trim() === tsvRow.morph_in_context
			);

			if (!matchingRecord) {
				notFoundCount++;
				notFoundRows.push(tsvRow);
				console.warn(
					`No match found for: word="${tsvRow.word}", morph_in_context="${tsvRow.morph_in_context}"`
				);
				continue;
			}

			// Prepare update data
			const updateData: any = {};

			// Update english_meaning if provided
			if (tsvRow.english_meaning) {
				updateData.english_meaning = tsvRow.english_meaning;
			}

			// Update Telugu meaning in meanings Map
			if (tsvRow.telugu_meaning) {
				// Get existing meanings Map or create new one
				const existingMeanings = matchingRecord.meanings || {};
				const meaningsMap =
					existingMeanings instanceof Map
						? new Map(existingMeanings)
						: new Map(Object.entries(existingMeanings));

				// Set Telugu meaning
				meaningsMap.set(TELUGU_LANG_CODE, tsvRow.telugu_meaning);

				// Convert Map to object for MongoDB update
				updateData.meanings = Object.fromEntries(meaningsMap);
			}

			// Update the record
			await Analysis.findByIdAndUpdate(matchingRecord._id, {
				$set: updateData,
			});

			updatedCount++;
			console.log(
				`✓ Updated record ${matchingRecord._id}: word="${tsvRow.word}", morph_in_context="${tsvRow.morph_in_context}"`
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
					`${index + 1}. word="${row.word}", morph_in_context="${row.morph_in_context}"`
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

