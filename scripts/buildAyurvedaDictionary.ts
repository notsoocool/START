#!/usr/bin/env bun

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

interface RawRow {
	[key: string]: unknown;
	"#term_devanagari"?: string;
	w_def?: string;
}

interface AyurvedaEntry {
	term: string;
	definition: string;
}

const MAX_ROWS = 10410;

async function buildAyurvedaDictionary() {
	const xlsxPath = path.join(
		process.cwd(),
		"docs",
		"Ayurveda_Dictionaries_from_NIIMH.xlsx"
	);
	const outPath = path.join(process.cwd(), "docs", "ayurvedaDict.json");

	if (!fs.existsSync(xlsxPath)) {
		console.error(`Input file not found at: ${xlsxPath}`);
		process.exit(1);
	}

	console.log(`Reading Excel file from: ${xlsxPath}`);
	const workbook = XLSX.readFile(xlsxPath);
	const firstSheetName = workbook.SheetNames[0];
	const sheet = workbook.Sheets[firstSheetName];

	const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
		defval: "",
	});

	console.log(`Total rows in sheet: ${rows.length}`);
	if (rows.length > 0) {
		console.log("Sample row keys:", Object.keys(rows[0]));
	}

	const sliced = rows.slice(0, MAX_ROWS);
	console.log(`Processing first ${sliced.length} rows`);

	const map = new Map<string, AyurvedaEntry>();

	for (const row of sliced) {
		// Adjust these keys if the sample output shows different header names
		const rawTerm = (row["#term_devanagari"] ?? row["term_devanagari"] ?? "") as string;
		const rawDef = (row["w_def"] ?? row["definition"] ?? "") as string;

		const term = rawTerm.trim();
		const definition = rawDef.trim();

		if (!term || !definition) continue;

		if (!map.has(term)) {
			map.set(term, { term, definition });
		}
	}

	const entries = Array.from(map.values());

	fs.writeFileSync(outPath, JSON.stringify(entries, null, 2), "utf-8");

	console.log(
		`Wrote ${entries.length} Ayurveda dictionary entries to ${outPath}`
	);
}

buildAyurvedaDictionary().catch((err) => {
	console.error("Failed to build Ayurveda dictionary:", err);
	process.exit(1);
});

