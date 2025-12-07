#!/usr/bin/env bun

import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";

interface Args {
	book?: string;
	part1?: string | null;
	part2?: string | null;
	chaptno?: string;
	limit?: number;
	deleteOrphans: boolean;
	force: boolean;
}

function parseArgs(): Args {
	const args = process.argv.slice(2);
	const out: Args = {
		deleteOrphans: false,
		force: false,
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
		} else if (a === "--chaptno" && args[i + 1]) {
			out.chaptno = args[++i];
		} else if (a === "--limit" && args[i + 1]) {
			out.limit = Number(args[++i]);
		} else if (a === "--delete") {
			out.deleteOrphans = true;
		} else if (a === "--force") {
			out.force = true;
		} else if (a === "--help" || a === "-h") {
			printUsage();
			process.exit(0);
		}
	}

	return out;
}

function printUsage() {
	console.log(`Find Analysis rows whose [book, part1, part2, chaptno, slokano] tuple does NOT exist in Shloka model.

Exact matching is done on these 5 fields:
  book, part1, part2, chaptno, slokano

Usage:
  bun scripts/findOrphanAnalysisChapters.ts [options]

Options:
  --book <name>        Filter by book
  --part1 <value>      Filter by part1 (use "null" for null)
  --part2 <value>      Filter by part2 (use "null" for null)
  --chaptno <no>       Filter by chapter number
  --limit N            Limit number of orphan tuples printed
  --delete             Delete all Analysis rows for each orphan tuple
  --force              Skip safety checks when used with --delete
  --help, -h           Show this help

Examples:
  # Scan all analysis slokas
  bun scripts/findOrphanAnalysisChapters.ts

  # Only for a specific book/part1/part2
  bun scripts/findOrphanAnalysisChapters.ts --book महाभारतम् --part1 उद्योगपर्वः --part2 null
`);
}

async function main() {
	const { book, part1, part2, chaptno, limit, deleteOrphans, force } =
		parseArgs();

	if (!process.env.MONGO_URI) {
		console.error("MONGO_URI is not set");
		process.exit(1);
	}

	await dbConnect();
	console.log("Connected to database");

	const match: Record<string, unknown> = {};
	if (book) match.book = book;
	if (typeof part1 !== "undefined") match.part1 = part1;
	if (typeof part2 !== "undefined") match.part2 = part2;
	if (chaptno) match.chaptno = chaptno;

	const pipeline: any[] = [];

	if (Object.keys(match).length) {
		pipeline.push({ $match: match });
	}

	// Group Analysis by full sloka tuple
	pipeline.push({
		$group: {
			_id: {
				book: "$book",
				// Normalize null/undefined part1/part2 to a consistent null value
				part1: { $ifNull: ["$part1", null] },
				part2: { $ifNull: ["$part2", null] },
				chaptno: "$chaptno",
				slokano: "$slokano",
			},
			count: { $sum: 1 },
		},
	});

	// Left-join each tuple to Shloka on the same 5 fields, with null-aware matching for part1/part2
	pipeline.push({
		$lookup: {
			from: "shlokas",
			let: {
				book: "$_id.book",
				part1: "$_id.part1",
				part2: "$_id.part2",
				chaptno: "$_id.chaptno",
				slokano: "$_id.slokano",
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$and: [
								{ $eq: ["$book", "$$book"] },
								{
									$eq: [
										{ $ifNull: ["$part1", null] },
										"$$part1",
									],
								},
								{
									$eq: [
										{ $ifNull: ["$part2", null] },
										"$$part2",
									],
								},
								{ $eq: ["$chaptno", "$$chaptno"] },
								{ $eq: ["$slokano", "$$slokano"] },
							],
						},
					},
				},
			],
			as: "shlokaMatches",
		},
	});

	// Keep only tuples with NO matching Shloka row
	pipeline.push({
		$match: {
			shlokaMatches: { $size: 0 },
		},
	});

	// Shape the output
	pipeline.push({
		$project: {
			_id: 0,
			book: "$_id.book",
			part1: "$_id.part1",
			part2: "$_id.part2",
			chaptno: "$_id.chaptno",
			slokano: "$_id.slokano",
			analysisCount: "$count",
		},
	});

	if (limit && Number.isFinite(limit)) {
		pipeline.push({ $limit: limit });
	}

	console.log(
		"Running aggregation to find analysis [book, part1, part2, chaptno, slokano] tuples without any shloka..."
	);
	const orphans = await Analysis.aggregate(pipeline).allowDiskUse(true);

	if (!orphans.length) {
		console.log(
			"✅ No orphan analysis sloka tuples found for the given filters."
		);
		process.exit(0);
	}

	console.log(
		`\nFound ${orphans.length} analysis sloka tuple(s) without matching shloka:`
	);
	for (const row of orphans) {
		console.log(
			`- book=${row.book}, part1=${row.part1 ?? "<null>"}, part2=${
				row.part2 ?? "<null>"
			}, chaptno=${row.chaptno}, slokano=${row.slokano} (analysis rows: ${
				row.analysisCount
			})`
		);
	}

	// If not deleting, we are done
	if (!deleteOrphans) {
		process.exit(0);
	}

	if (!force) {
		console.log(
			"\n❌ Refusing to delete without --force. Re-run with --delete --force if you are sure."
		);
		process.exit(1);
	}

	// Delete Analysis rows for each orphan tuple
	let totalDeleted = 0;

	for (const row of orphans) {
		const deleteQuery: any = {
			book: row.book,
			chaptno: row.chaptno,
			slokano: row.slokano,
		};

		if (row.part1 === null) {
			deleteQuery.part1 = { $in: [null, undefined] };
		} else {
			deleteQuery.part1 = row.part1;
		}

		if (row.part2 === null) {
			deleteQuery.part2 = { $in: [null, undefined] };
		} else {
			deleteQuery.part2 = row.part2;
		}

		const res = await Analysis.deleteMany(deleteQuery);
		totalDeleted += res.deletedCount ?? 0;
		console.log(
			`🗑️  Deleted ${res.deletedCount ?? 0} Analysis row(s) for book=${
				row.book
			}, part1=${row.part1 ?? "<null>"}, part2=${
				row.part2 ?? "<null>"
			}, chaptno=${row.chaptno}, slokano=${row.slokano}`
		);
	}

	console.log(`\n✅ Total Analysis rows deleted: ${totalDeleted}`);

	process.exit(0);
}

main().catch((err) => {
	console.error("Error finding orphan analysis chapters:", err);
	process.exit(1);
});
