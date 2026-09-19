#!/usr/bin/env bun
/**
 * Replace अभिहित_कर्ता / अभिहित_कर्म (and short forms अभि_कर्ता / अभि_कर्म)
 * with "-" in Analysis.kaaraka_sambandha and Analysis.possible_relations.
 *
 * Usage:
 *   bun scripts/replaceAbhihitaRelations.ts           # apply
 *   bun scripts/replaceAbhihitaRelations.ts --dry-run  # preview counts only
 */

import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";

const REPLACEMENTS = [
	"अभिहित_कर्ता",
	"अभिहित_कर्म",
	"अभि_कर्ता",
	"अभि_कर्म",
] as const;

const FIELDS = ["kaaraka_sambandha", "possible_relations"] as const;

async function main() {
	const dryRun = process.argv.includes("--dry-run");
	await dbConnect();

	console.log(dryRun ? "DRY RUN — no writes\n" : "APPLYING replacements\n");

	for (const field of FIELDS) {
		for (const find of REPLACEMENTS) {
			const filter = { [field]: { $regex: find } };
			const count = await Analysis.countDocuments(filter);
			console.log(`${field}: "${find}" → "-"  (${count} docs)`);

			if (!dryRun && count > 0) {
				const result = await Analysis.updateMany(filter, [
					{
						$set: {
							[field]: {
								$replaceAll: {
									input: `$${field}`,
									find,
									replacement: "-",
								},
							},
						},
					},
				]);
				console.log(`  matched=${result.matchedCount} modified=${result.modifiedCount}`);
			}
		}
	}

	if (!dryRun) {
		console.log("\nRemaining counts (should be 0):");
		for (const field of FIELDS) {
			for (const find of REPLACEMENTS) {
				const n = await Analysis.countDocuments({
					[field]: { $regex: find },
				});
				if (n > 0) console.log(`  WARN ${field} still has ${find}: ${n}`);
			}
		}
		console.log("Done.");
	}

	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
