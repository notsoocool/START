#!/usr/bin/env bun

import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import Shloka from "@/lib/db/newShlokaModel";
import { logHistory } from "@/lib/utils/historyLogger";

async function fixSlokanoFormat() {
	try {
		await dbConnect();
		console.log("Connected to database");

		// Fix Analysis model
		const analysisEntries = await Analysis.find({
			book: "रघुवंश",
			chaptno: "13",
		});

		console.log(`Found ${analysisEntries.length} analysis entries to update`);

		for (const entry of analysisEntries) {
			const oldSlokano = entry.slokano;
			const newSlokano = oldSlokano.padStart(3, "0");

			if (oldSlokano !== newSlokano) {
				// Update the entry
				await Analysis.findByIdAndUpdate(entry._id, {
					$set: { slokano: newSlokano },
				});

				// Log the change
				await logHistory({
					action: "edit",
					modelType: "Analysis",
					details: {
						book: entry.book,
						part1: entry.part1,
						part2: entry.part2,
						chaptno: entry.chaptno,
						slokano: oldSlokano,
						changes: [
							{
								field: "slokano",
								oldValue: oldSlokano,
								newValue: newSlokano,
							},
						],
					},
				});

				console.log(`Updated Analysis entry: ${oldSlokano} -> ${newSlokano}`);
			}
		}

		// Fix Shloka model
		const shlokaEntries = await Shloka.find({
			book: "रघुवंश",
			chaptno: "13",
		});

		console.log(`Found ${shlokaEntries.length} shloka entries to update`);

		for (const entry of shlokaEntries) {
			const oldSlokano = entry.slokano;
			const newSlokano = oldSlokano.padStart(3, "0");

			if (oldSlokano !== newSlokano) {
				// Update the entry
				await Shloka.findByIdAndUpdate(entry._id, {
					$set: { slokano: newSlokano },
				});

				// Log the change
				await logHistory({
					action: "edit",
					modelType: "Shloka",
					details: {
						book: entry.book,
						part1: entry.part1,
						part2: entry.part2,
						chaptno: entry.chaptno,
						slokano: oldSlokano,
						changes: [
							{
								field: "slokano",
								oldValue: oldSlokano,
								newValue: newSlokano,
							},
						],
					},
				});

				console.log(`Updated Shloka entry: ${oldSlokano} -> ${newSlokano}`);
			}
		}

		console.log("Finished updating slokano format");
		process.exit(0);
	} catch (error) {
		console.error("Error fixing slokano format:", error);
		process.exit(1);
	}
}

// Run the script
fixSlokanoFormat();
