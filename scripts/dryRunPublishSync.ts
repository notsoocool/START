/**
 * READ-ONLY dry run: list books with mixed userPublished/groupPublished
 * and propose setting remaining rows to true so the whole book matches.
 *
 * Usage: bun scripts/dryRunPublishSync.ts
 * Does not write unless APPLY=1 is set (refuse by default).
 */
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

function loadEnvLocal() {
	const p = path.join(process.cwd(), ".env.local");
	const env: Record<string, string> = {};
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
		env[key] = val;
	}
	return env;
}

type Action = {
	field: "userPublished" | "groupPublished";
	setTo: true;
	wouldUpdate: number;
	currentlyTrue: number;
	currentlyFalse: number;
};

type PlanItem = {
	book: string;
	totalShlokas: number;
	actions: Action[];
};

async function main() {
	const apply = process.env.APPLY === "1";
	if (apply) {
		console.error("APPLY=1 refused in this script entry — use apply path only after explicit yes.");
		process.exit(2);
	}

	const env = loadEnvLocal();
	const uri = env.MONGO_URI || env.MONGODB_URI;
	if (!uri) throw new Error("MONGO_URI missing in .env.local");

	await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
	const names = (await mongoose.connection.db!.listCollections().toArray()).map(
		(c) => c.name
	);
	const shlokaCol =
		names.find((n) => n === "ahshlokas") ||
		names.find((n) => /shloka/i.test(n)) ||
		"ahshlokas";
	console.log("Collection:", shlokaCol);
	const c = mongoose.connection.db!.collection(shlokaCol);

	const rows = await c
		.aggregate([
			{
				$group: {
					_id: "$book",
					total: { $sum: 1 },
					userTrue: {
						$sum: { $cond: [{ $eq: ["$userPublished", true] }, 1, 0] },
					},
					userFalse: {
						$sum: { $cond: [{ $ne: ["$userPublished", true] }, 1, 0] },
					},
					groupTrue: {
						$sum: { $cond: [{ $eq: ["$groupPublished", true] }, 1, 0] },
					},
					groupFalse: {
						$sum: { $cond: [{ $ne: ["$groupPublished", true] }, 1, 0] },
					},
				},
			},
			{ $sort: { _id: 1 } },
		])
		.toArray();

	const plan: PlanItem[] = [];
	for (const r of rows) {
		const userMixed = r.userTrue > 0 && r.userFalse > 0;
		const groupMixed = r.groupTrue > 0 && r.groupFalse > 0;
		if (!userMixed && !groupMixed) continue;

		const actions: Action[] = [];
		if (userMixed) {
			actions.push({
				field: "userPublished",
				setTo: true,
				wouldUpdate: r.userFalse,
				currentlyTrue: r.userTrue,
				currentlyFalse: r.userFalse,
			});
		}
		if (groupMixed) {
			actions.push({
				field: "groupPublished",
				setTo: true,
				wouldUpdate: r.groupFalse,
				currentlyTrue: r.groupTrue,
				currentlyFalse: r.groupFalse,
			});
		}
		plan.push({
			book: String(r._id),
			totalShlokas: r.total,
			actions,
		});
	}

	let totalUpdates = 0;
	console.log("\n=== DRY RUN ONLY — no writes ===");
	console.log(`Books scanned: ${rows.length}`);
	console.log(`Books needing sync: ${plan.length}`);
	for (const p of plan) {
		console.log(`\n${p.book} (${p.totalShlokas} shlokas)`);
		for (const a of p.actions) {
			totalUpdates += a.wouldUpdate;
			console.log(
				`  → set ${a.field}=true on ${a.wouldUpdate} rows (true=${a.currentlyTrue}, false=${a.currentlyFalse})`
			);
		}
	}
	console.log(`\nTOTAL document updates if applied: ${totalUpdates}`);
	console.log(
		"Rule: if any shloka in the book has the flag true, set the rest true (whole book same)."
	);
	console.log("Locked: unchanged. No deletes.");
	console.log("\nSay yes to apply this plan; until then nothing is written.");

	fs.writeFileSync(
		"/tmp/start_publish_sync_dryrun.json",
		JSON.stringify({ plan, totalUpdates, collection: shlokaCol }, null, 2)
	);

	await mongoose.disconnect();
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
