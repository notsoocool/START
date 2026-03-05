#!/usr/bin/env bun

/**
 * List all distinct chaptno values in the Analysis collection for a given book and part1.
 *
 * Usage:
 *   bun scripts/listChaptno.ts
 *   bun scripts/listChaptno.ts --book "महाभारतम्" --part1 "उद्योगपर्वः"
 *   bun scripts/listChaptno.ts --book "चरक संहिता" --part1 "सूत्र स्थान" --part2 null
 *
 * Requires MONGO_URI in .env.local or environment.
 */

// Bun loads .env.local automatically. For node: set MONGO_URI or use dotenv.
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";

interface Args {
	book: string;
	part1: string | null;
	part2: string | null | undefined; // undefined = not specified
}

function parseArgs(): Args {
	const args = process.argv.slice(2);
	const out: Args = {
		book: "महाभारतम्",
		part1: "उद्योगपर्वः",
		part2: undefined,
	};

	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === "--book" && args[i + 1]) {
			out.book = args[++i];
		} else if (a === "--part1" && args[i + 1]) {
			const v = args[++i];
			out.part1 = v === "null" ? null : v;
		} else if (a === "--part2" && args[i + 1]) {
			const v = args[++i];
			out.part2 = v === "null" ? null : v;
		} else if (a === "--help" || a === "-h") {
			console.log(`List all chaptno values in the Analysis collection for a given book/part1/part2.

Usage:
  bun scripts/listChaptno.ts [options]

Options:
  --book <name>    Book name (default: महाभारतम्)
  --part1 <value> Part 1 (default: उद्योगपर्वः). Use "null" for null.
  --part2 <value> Part 2 filter. Use "null" for null. Omit to match any part2.
  --help, -h      Show this help

Examples:
  bun scripts/listChaptno.ts
  bun scripts/listChaptno.ts --book "चरक संहिता" --part1 "सूत्र स्थान"
  bun scripts/listChaptno.ts --book "महाभारतम्" --part1 "उद्योगपर्वः" --part2 null
`);
			process.exit(0);
		}
	}

	return out;
}

async function main() {
	const { book, part1, part2 } = parseArgs();

	if (!process.env.MONGO_URI) {
		console.error("MONGO_URI is not set. Ensure .env.local exists or set it in the environment.");
		process.exit(1);
	}

	await dbConnect();
	console.log("Connected to database\n");

	const match: Record<string, unknown> = { book };
	if (part1 === null) {
		match.part1 = { $in: [null, undefined] };
	} else {
		match.part1 = part1;
	}
	if (part2 !== undefined) {
		if (part2 === null) {
			match.part2 = { $in: [null, undefined] };
		} else {
			match.part2 = part2;
		}
	}

	console.log("Query:", JSON.stringify({ book, part1, part2: part2 ?? "(any)" }, null, 2));
	console.log("");

	const chaptnos = await Analysis.distinct("chaptno", match);
	const sorted = [...chaptnos].sort((a, b) => {
		// Natural sort for chapter numbers (e.g. "01", "02", "10")
		const na = parseInt(a, 10);
		const nb = parseInt(b, 10);
		if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
		return String(a).localeCompare(String(b));
	});

	console.log(`Found ${sorted.length} distinct chaptno value(s):\n`);
	for (const c of sorted) {
		console.log(`  ${c}`);
	}
	console.log("");

	process.exit(0);
}

main().catch((err) => {
	console.error("Error:", err);
	process.exit(1);
});
