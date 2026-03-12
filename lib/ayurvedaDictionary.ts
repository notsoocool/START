import * as fs from "fs";
import * as path from "path";

interface AyurvedaEntry {
	term: string;
	definition: string;
}

let ayurvedaMap: Map<string, AyurvedaEntry> | null = null;

function normalize(term: string): string {
	return term
		.normalize("NFC")
		.replace(/[\u200c\u200d]/g, "") // strip zero-width joiner/non-joiner
		.replace(/[।॥.,;:!?]+$/, "") // strip common trailing punctuation/dandas
		.trim();
}

function loadAyurvedaDict(): Map<string, AyurvedaEntry> {
	if (ayurvedaMap) return ayurvedaMap;

	const filePath = path.join(process.cwd(), "docs", "ayurvedaDict.json");
	const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as AyurvedaEntry[];

	ayurvedaMap = new Map(
		raw.map((entry) => [normalize(entry.term), entry])
	);

	return ayurvedaMap;
}

export function lookupAyurvedaMeaning(term: string): string | null {
	const map = loadAyurvedaDict();
	const entry = map.get(normalize(term));
	return entry?.definition ?? null;
}

