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

function parseArgs(): { keys: KeyName[]; limit?: number; book?: string; chaptno?: string; inspect?: boolean; mode?: "exact" | "keys" } {
    const args = process.argv.slice(2);
    const out: { keys: KeyName[]; limit?: number; book?: string; chaptno?: string; inspect?: boolean; mode?: "exact" | "keys" } = {
        keys: ["book", "part1", "part2", "chaptno", "slokano", "sentno", "word", "graph", "anvaya_no"],
        mode: "exact",
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
        } else if (a === "--inspect") {
            out.inspect = true;
        } else if (a === "--mode" && args[i + 1]) {
            const m = args[++i];
            if (m === "exact" || m === "keys") out.mode = m;
        }
    }
    return out;
}

function printUsage() {
    console.log(`Find duplicate Analysis documents by grouping keys.

Usage:
  bun scripts/findDuplicateAnalyses.ts [--keys k1,k2,...] [--book <name>] [--chaptno <no>] [--limit N]

Defaults:
  --keys book,part1,part2,chaptno,slokano,sentno,word

Examples:
  bun scripts/findDuplicateAnalyses.ts
  bun scripts/findDuplicateAnalyses.ts --book रघुवंश --chaptno 13
  bun scripts/findDuplicateAnalyses.ts --keys book,chaptno,slokano,word
`);
}

async function main() {
    const { keys, limit, book, chaptno, inspect, mode } = parseArgs();
    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is not set");
        process.exit(1);
    }

    await dbConnect();

    const match: Record<string, unknown> = {};
    if (book) match.book = book;
    if (chaptno) match.chaptno = chaptno;

    // Build pipeline
    const pipeline: any[] = [Object.keys(match).length ? { $match: match } : undefined];

    if (mode === "exact") {
        // Build a deterministic composite key from all content fields
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
        pipeline.push({ $group: { _id: "$dupeKey", count: { $sum: 1 }, ids: { $push: "$_id" } } });
    } else {
        const groupId: Record<string, string> = {};
        for (const k of keys) {
            groupId[k] = `$${k}`;
        }
        pipeline.push({ $group: { _id: groupId, count: { $sum: 1 }, ids: { $push: "$_id" } } });
    }

    pipeline.push({ $match: { count: { $gt: 1 } } });
    pipeline.push({ $sort: { count: -1 } });

    if (limit && Number.isFinite(limit)) {
        pipeline.push({ $limit: limit });
    }

    const dupGroups = await Analysis.aggregate(pipeline).allowDiskUse(true);

    if (!dupGroups.length) {
        console.log("No duplicates found for the selected keys.");
        process.exit(0);
    }

    console.log(`Found ${dupGroups.length} duplicate group(s).\n`);

    // Print a readable report
    for (const g of dupGroups) {
        if (mode === "exact") {
            console.log(`- GroupKey: ${g._id} (count=${g.count})`);
        } else {
            const keyParts = keys.map((k) => `${k}=${g._id?.[k] ?? "<null>"}`).join(" | ");
            console.log(`- Group: ${keyParts} (count=${g.count})`);
        }
        console.log(`  ids: ${g.ids.join(", ")}`);
        if (inspect) {
            const sampleIds = g.ids.slice(0, 3);
            const fields = mode === "exact"
                ? "book part1 part2 chaptno slokano sentno bgcolor graph anvaya_no word poem sandhied_word morph_analysis morph_in_context kaaraka_sambandha possible_relations hindi_meaning english_meaning samAsa prayoga sarvanAma name_classification"
                : keys.join(" ");
            const docs = await Analysis.find({ _id: { $in: sampleIds } }).select(fields).lean();
            for (const d of docs) {
                const line = mode === "exact"
                    ? [
                        "book","part1","part2","chaptno","slokano","sentno","bgcolor","graph","anvaya_no","word","poem","sandhied_word","morph_analysis","morph_in_context","kaaraka_sambandha","possible_relations","hindi_meaning","english_meaning","samAsa","prayoga","sarvanAma","name_classification"
                    ].map((k) => `${k}=${(d as any)[k] ?? "<null>"}`).join(" | ")
                    : keys.map((k) => `${k}=${(d as any)[k] ?? "<null>"}`).join(" | ");
                console.log(`    doc ${d._id}: ${line}`);
            }
        }
    }
}

if (process.argv.includes("--help")) {
    printUsage();
    process.exit(0);
}

main().catch((err) => {
    console.error("Error finding duplicates:", err);
    process.exit(1);
});


