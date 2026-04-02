#!/usr/bin/env bun
/**
 * Rename strings only in Group.assignedBooks (MongoDB Group collection).
 * Shloka/Analysis `book` is already handled by admin Replace Book → POST /api/books/replace.
 *
 * Pairs (old → new):
 *   Ramayanam_New → सङ्क्षेपरामायणम्
 *   रघुवंश → रघुवंशम्
 *   चरक संहिता → चरकसंहिता
 *
 * Usage:
 *   bun scripts/renameBookTitlesMigration.ts           # apply
 *   bun scripts/renameBookTitlesMigration.ts --dry-run # counts groups that would change
 *
 * Requires MONGO_URI (e.g. from .env.local).
 */

import mongoose from "mongoose";
import dbConnect from "@/lib/db/connect";
import Group from "@/lib/db/groupModel";

const RENAMES: { oldBook: string; newBook: string }[] = [
	{ oldBook: "Ramayanam_New", newBook: "सङ्क्षेपरामायणम्" },
	{ oldBook: "रघुवंश", newBook: "रघुवंशम्" },
	{ oldBook: "चरक संहिता", newBook: "चरकसंहिता" },
];

async function updateGroups(oldBook: string, newBook: string, dryRun: boolean): Promise<number> {
	const groupsWithOld = await Group.find({ assignedBooks: oldBook });
	if (dryRun) {
		return groupsWithOld.length;
	}
	let updated = 0;
	for (const group of groupsWithOld) {
		const nextBooks = Array.from(
			new Set(group.assignedBooks.map((b: string) => (b === oldBook ? newBook : b)))
		);
		group.assignedBooks = nextBooks;
		await group.save();
		updated += 1;
	}
	return updated;
}

async function main() {
	const dryRun = process.argv.includes("--dry-run");

	if (!process.env.MONGO_URI) {
		console.error("MONGO_URI is not set. Use .env.local or export MONGO_URI.");
		process.exit(1);
	}

	await dbConnect();

	console.log(dryRun ? "DRY RUN (no writes)\n" : "Updating Group.assignedBooks…\n");

	let totalGroups = 0;

	for (const { oldBook, newBook } of RENAMES) {
		if (oldBook === newBook) continue;
		console.log(`  "${oldBook}" → "${newBook}"`);
		const n = await updateGroups(oldBook, newBook, dryRun);
		console.log(`    groups ${dryRun ? "matched" : "updated"}: ${n}`);
		totalGroups += n;
	}

	console.log(`\nTotal groups ${dryRun ? "matched" : "updated"}: ${totalGroups}`);
	if (dryRun) {
		console.log("\nRun without --dry-run to apply.");
	} else {
		console.log("\nDone.");
	}

	await mongoose.disconnect().catch(() => {});
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
