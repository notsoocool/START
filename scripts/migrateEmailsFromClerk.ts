#!/usr/bin/env bun
/**
 * Backfill UserPermissions.email from Clerk using userID.
 *
 * Usage:
 *   bun scripts/migrateEmailsFromClerk.ts --dry-run   # report only
 *   bun scripts/migrateEmailsFromClerk.ts             # apply updates
 *
 * Requires MONGO_URI + CLERK_SECRET_KEY (e.g. from .env.local).
 */
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { createClerkClient } from "@clerk/backend";
import Perms from "@/lib/db/permissionsModel";
import { primaryEmailFromClerkUser } from "@/lib/auth/clerkEmail";

function loadEnvLocal() {
	const p = path.join(process.cwd(), ".env.local");
	if (!fs.existsSync(p)) return;
	for (const line of fs.readFileSync(p, "utf8").split("\n")) {
		const idx = line.indexOf("=");
		if (idx <= 0 || line.trimStart().startsWith("#")) continue;
		const key = line.slice(0, idx).trim();
		let val = line.slice(idx + 1).trim();
		if (
			(val.startsWith('"') && val.endsWith('"')) ||
			(val.startsWith("'") && val.endsWith("'"))
		) {
			val = val.slice(1, -1);
		}
		if (!(key in process.env)) process.env[key] = val;
	}
}

async function loadClerkEmailMap(
	clerk: ReturnType<typeof createClerkClient>
): Promise<Map<string, string | null>> {
	const map = new Map<string, string | null>();
	const limit = 500;
	let offset = 0;

	for (;;) {
		const page = await clerk.users.getUserList({ limit, offset });
		const users = page.data || [];
		for (const user of users) {
			map.set(user.id, primaryEmailFromClerkUser(user));
		}
		console.log(`  fetched Clerk users: ${map.size}`);
		if (users.length < limit) break;
		offset += limit;
	}

	return map;
}

async function main() {
	loadEnvLocal();
	const dryRun = process.argv.includes("--dry-run");

	const mongo = process.env.MONGO_URI || process.env.MONGODB_URI;
	// Prefer explicit live override so local .env.local (often sk_test_) is not used by accident
	const secret =
		process.env.CLERK_SECRET_KEY_LIVE || process.env.CLERK_SECRET_KEY;
	if (!mongo) {
		console.error("MONGO_URI is not set");
		process.exit(1);
	}
	if (!secret) {
		console.error("CLERK_SECRET_KEY is not set");
		process.exit(1);
	}

	const keyKind = secret.startsWith("sk_live_")
		? "live"
		: secret.startsWith("sk_test_")
			? "test"
			: "unknown";
	console.log(`Clerk key: ${keyKind} (${secret.slice(0, 10)}…)`);

	await mongoose.connect(mongo, { serverSelectionTimeoutMS: 20000 });
	const clerk = createClerkClient({ secretKey: secret });

	const rows = await Perms.find({}).select("userID name email perms").lean();
	console.log(
		dryRun
			? `DRY RUN — ${rows.length} permission rows`
			: `Applying email backfill — ${rows.length} permission rows`
	);

	console.log("Loading Clerk users…");
	const emailByUserId = await loadClerkEmailMap(clerk);
	console.log(`Clerk users loaded: ${emailByUserId.size}\n`);

	let already = 0;
	let updated = 0;
	let missingInClerk = 0;
	let noEmail = 0;
	const samples: string[] = [];
	const updateSamples: string[] = [];

	for (const row of rows) {
		const userID = String(row.userID);
		if (row.email && String(row.email).includes("@")) {
			already += 1;
			continue;
		}

		if (!emailByUserId.has(userID)) {
			missingInClerk += 1;
			if (samples.length < 8) {
				samples.push(`${userID} (${row.name}) — not found in Clerk`);
			}
			continue;
		}

		const email = emailByUserId.get(userID);
		if (!email) {
			noEmail += 1;
			if (samples.length < 8) {
				samples.push(`${userID} (${row.name}) — Clerk user has no email`);
			}
			continue;
		}

		if (!dryRun) {
			await Perms.updateOne({ userID }, { $set: { email } });
		}
		updated += 1;
		if (updateSamples.length < 12) {
			updateSamples.push(`${row.name} (${row.perms}) ← ${email}`);
		}
	}

	console.log("Summary:");
	console.log(`  already had email: ${already}`);
	console.log(`  ${dryRun ? "would update" : "updated"}: ${updated}`);
	console.log(`  missing in Clerk:  ${missingInClerk}`);
	console.log(`  Clerk user, no email: ${noEmail}`);
	if (updateSamples.length) {
		console.log("\nWould update / updated samples:");
		for (const s of updateSamples) console.log(`  ${s}`);
	}
	if (samples.length) {
		console.log("\nMissing samples:");
		for (const s of samples) console.log(`  ${s}`);
	}

	const overlap = updated + noEmail;
	const missingRatio = rows.length ? missingInClerk / rows.length : 0;
	if (keyKind === "test" && missingRatio > 0.5) {
		console.error(
			`\nRefusing: Clerk test key only overlaps ~${overlap}/${rows.length} rows (${missingInClerk} missing). Set CLERK_SECRET_KEY_LIVE=sk_live_… and re-run.`
		);
		await mongoose.disconnect().catch(() => {});
		process.exit(2);
	}

	if (dryRun) {
		console.log("\nRun without --dry-run to apply.");
	} else {
		console.log("\nDone.");
	}

	await mongoose.disconnect().catch(() => {});
}

main().catch(async (e) => {
	console.error(e);
	try {
		await mongoose.disconnect();
	} catch {
		/* ignore */
	}
	process.exit(1);
});
