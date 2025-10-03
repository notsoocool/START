#!/usr/bin/env bun

import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";

type KeyName =
    | "book"
    | "part1"
    | "part2"
    | "chaptno"
    | "slokano"
    | "sentno"
    | "word"
    | "graph"
    | "anvaya_no";

// Simplified: just keep first duplicate, delete the rest

function parseArgs(): { 
    keys: KeyName[]; 
    limit?: number; 
    book?: string; 
    chaptno?: string;
    dryRun: boolean;
    force: boolean;
    verify?: boolean;
    mode?: "exact" | "keys";
} {
    const args = process.argv.slice(2);
    const out: { 
        keys: KeyName[]; 
        limit?: number; 
        book?: string; 
        chaptno?: string;
        dryRun: boolean;
        force: boolean;
        verify?: boolean;
        mode?: "exact" | "keys";
    } = {
        keys: ["book", "part1", "part2", "chaptno", "slokano", "sentno", "word", "graph", "anvaya_no"],
        dryRun: false,
        force: false,
    };
    
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === "--keys" && args[i + 1]) {
            const list = args[++i].split(",").map((s) => s.trim()).filter(Boolean) as KeyName[];
            if (list.length > 0) out.keys = list;
        } else if (a === "--limit" && args[i + 1]) {
            out.limit = Number(args[++i]);
        } else if (a === "--book" && args[i + 1]) {
            out.book = args[++i];
        } else if (a === "--chaptno" && args[i + 1]) {
            out.chaptno = args[++i];
        } else if (a === "--dry-run") {
            out.dryRun = true;
        } else if (a === "--force") {
            out.force = true;
        } else if (a === "--verify") {
            out.verify = true;
        } else if (a === "--mode" && args[i + 1]) {
            const m = args[++i];
            if (m === "exact" || m === "keys") out.mode = m;
        }
    }
    return out;
}

function printUsage() {
    console.log(`Delete duplicate Analysis documents by grouping keys.

Usage:
  bun scripts/deleteDuplicateAnalyses.ts [options]

Options:
  --keys k1,k2,...     Grouping keys (default: book,part1,part2,chaptno,slokano,sentno,word,graph,anvaya_no)
  --book <name>        Filter by book name
  --chaptno <no>       Filter by chapter number
  --limit N            Limit number of duplicate groups to process
  --dry-run           Show what would be deleted without actually deleting
  --force             Skip confirmation prompts
  --verify            Print sample docs' key fields for validation
  --mode <exact|keys>  exact=match all content fields; keys=match provided keys (default: exact)
  --help              Show this help

Examples:
  bun scripts/deleteDuplicateAnalyses.ts --dry-run
  bun scripts/deleteDuplicateAnalyses.ts --book रघुवंश --chaptno 13
  bun scripts/deleteDuplicateAnalyses.ts --keys book,chaptno,slokano,word --force

WARNING: This will permanently delete duplicate entries from your database!
Use --dry-run first to see what would be deleted.
`);
}

async function confirmDeletion(totalToDelete: number, dryRun: boolean): Promise<boolean> {
    if (dryRun) return true;
    
    console.log(`\n⚠️  WARNING: This will permanently delete ${totalToDelete} duplicate entries!`);
    console.log("This action cannot be undone.");
    
    // In a real environment, you'd want to use a proper readline interface
    // For now, we'll use a simple approach
    console.log("\nType 'DELETE' to confirm, or anything else to cancel:");
    
    // Since we can't easily do interactive input in a script, we'll require --force flag
    return false;
}

async function deleteDuplicates() {
    const { keys, limit, book, chaptno, dryRun, force, verify, mode } = parseArgs();
    
    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is not set");
        process.exit(1);
    }

    await dbConnect();
    console.log("Connected to database");

    const match: Record<string, unknown> = {};
    if (book) match.book = book;
    if (chaptno) match.chaptno = chaptno;

    // Build pipeline (memory-efficient: only keep ids)
    const pipeline: any[] = [Object.keys(match).length ? { $match: match } : undefined];

    if (mode === "keys") {
        const groupId: Record<string, string> = {};
        for (const k of keys) {
            groupId[k] = `$${k}`;
        }
        pipeline.push({ $group: { _id: groupId, count: { $sum: 1 }, ids: { $push: "$_id" }, keepId: { $first: "$_id" } } });
    } else {
        // default exact mode: match all content fields
        pipeline.push({
            $project: {
                _id: 1,
                dupeKey: {
                    $concat: [
                        { $ifNull: ["$book", "<null>"] }, "|",
                        { $ifNull: ["$part1", "<null>"] }, "|",
                        { $ifNull: ["$part2", "<null>"] }, "|",
                        { $ifNull: ["$chaptno", "<null>"] }, "|",
                        { $ifNull: ["$slokano", "<null>"] }, "|",
                        { $ifNull: ["$sentno", "<null>"] }, "|",
                        { $ifNull: ["$bgcolor", "<null>"] }, "|",
                        { $ifNull: ["$graph", "<null>"] }, "|",
                        { $ifNull: ["$anvaya_no", "<null>"] }, "|",
                        { $ifNull: ["$word", "<null>"] }, "|",
                        { $ifNull: ["$poem", "<null>"] }, "|",
                        { $ifNull: ["$sandhied_word", "<null>"] }, "|",
                        { $ifNull: ["$morph_analysis", "<null>"] }, "|",
                        { $ifNull: ["$morph_in_context", "<null>"] }, "|",
                        { $ifNull: ["$kaaraka_sambandha", "<null>"] }, "|",
                        { $ifNull: ["$possible_relations", "<null>"] }, "|",
                        { $ifNull: ["$hindi_meaning", "<null>"] }, "|",
                        { $ifNull: ["$english_meaning", "<null>"] }, "|",
                        { $ifNull: ["$samAsa", "<null>"] }, "|",
                        { $ifNull: ["$prayoga", "<null>"] }, "|",
                        { $ifNull: ["$sarvanAma", "<null>"] }, "|",
                        { $ifNull: ["$name_classification", "<null>"] },
                    ],
                },
            },
        });
        pipeline.push({ $group: { _id: "$dupeKey", count: { $sum: 1 }, ids: { $push: "$_id" }, keepId: { $first: "$_id" } } });
    }

    if (limit && Number.isFinite(limit)) {
        pipeline.push({ $limit: limit });
    }

    console.log("Running aggregation with allowDiskUse: true...");
    const dupGroups = await Analysis.aggregate(pipeline).allowDiskUse(true);

    if (!dupGroups.length) {
        console.log("No duplicates found for the selected keys.");
        process.exit(0);
    }

    console.log(`Found ${dupGroups.length} duplicate group(s).\n`);

    let totalToDelete = 0;
    const deletions: string[] = [];

    // Process each duplicate group
    for (const group of dupGroups) {
        const ids: string[] = group.ids as string[];
        const keyLabel = mode === "keys"
            ? keys.map((k) => `${k}=${group._id?.[k] ?? "<null>"}`).join(" | ")
            : String(group._id);
        
        console.log(`Group: ${keyLabel} (${ids.length} duplicates)`);
        if (verify) {
            const sampleIds = ids.slice(0, 3);
            const fields = mode === "keys"
                ? keys.join(" ")
                : "book part1 part2 chaptno slokano sentno bgcolor graph anvaya_no word poem sandhied_word morph_analysis morph_in_context kaaraka_sambandha possible_relations hindi_meaning english_meaning samAsa prayoga sarvanAma name_classification";
            const docs = await Analysis.find({ _id: { $in: sampleIds } }).select(fields).lean();
            for (const d of docs) {
                const line = (mode === "keys")
                    ? keys.map((k) => `${k}=${(d as any)[k] ?? "<null>"}`).join(" | ")
                    : [
                        "book","part1","part2","chaptno","slokano","sentno","bgcolor","graph","anvaya_no","word","poem","sandhied_word","morph_analysis","morph_in_context","kaaraka_sambandha","possible_relations","hindi_meaning","english_meaning","samAsa","prayoga","sarvanAma","name_classification"
                      ].map((k) => `${k}=${(d as any)[k] ?? "<null>"}`).join(" | ");
                console.log(`  doc ${d._id}: ${line}`);
            }
        }
        
        // Keep first id (as returned by aggregation), delete the rest
        const keepId: string = (group.keepId || ids[0]).toString();
        const deleteIds: string[] = ids.filter((id) => id.toString() !== keepId);
        
        console.log(`  Keeping: ${keepId}`);
        console.log(`  Deleting: ${deleteIds.join(", ")}`);
        
        totalToDelete += deleteIds.length;
        deletions.push(...deleteIds.map((id) => id.toString()));
    }

    console.log(`\nTotal entries to delete: ${totalToDelete}`);

    if (dryRun) {
        console.log("\n🔍 DRY RUN - No actual deletions performed");
        console.log("Run without --dry-run to perform actual deletions");
        process.exit(0);
    }

    // Confirmation
    if (!force) {
        console.log("\n❌ Interactive confirmation not available in this script.");
        console.log("Use --force flag to skip confirmation, or use --dry-run to preview first.");
        console.log("Example: bun scripts/deleteDuplicateAnalyses.ts --dry-run");
        process.exit(1);
    }

    // Perform deletions
    console.log("\n🗑️  Deleting duplicates...");
    
    let deletedCount = 0;
    for (const id of deletions) {
        try {
            await Analysis.findByIdAndDelete(id);
            deletedCount++;
            if (deletedCount % 100 === 0) {
                console.log(`Deleted ${deletedCount}/${totalToDelete} entries...`);
            }
        } catch (error) {
            console.error(`Error deleting ${id}:`, error);
        }
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} duplicate entries`);
    console.log(`Kept ${dupGroups.length} entries (one per duplicate group)`);
}

if (process.argv.includes("--help")) {
    printUsage();
    process.exit(0);
}

deleteDuplicates().catch((err) => {
    console.error("Error deleting duplicates:", err);
    process.exit(1);
});
