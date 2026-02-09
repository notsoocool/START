import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";
import AHShloka from "@/lib/db/newShlokaModel";

interface Params {
	book: string;
}

function corsHeaders() {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	};
}

function joinWordsWithHyphenRule(tokens: string[]): string {
	let output = "";
	for (const token of tokens) {
		const word = String(token ?? "").trim();
		if (!word) continue;
		if (output.endsWith("-")) {
			output += word;
		} else {
			output += (output ? " " : "") + word;
		}
	}
	return output;
}

function sortByAnvaya(a: { anvaya_no?: string }, b: { anvaya_no?: string }) {
	const [am, as] = String(a?.anvaya_no ?? "0.0")
		.split(".")
		.map((n) => parseInt(n, 10) || 0);
	const [bm, bs] = String(b?.anvaya_no ?? "0.0")
		.split(".")
		.map((n) => parseInt(n, 10) || 0);
	if (am !== bm) return am - bm;
	return as - bs;
}

function analysisKey(row: {
	part1?: string | null;
	part2?: string | null;
	chaptno?: string;
	slokano?: string;
}) {
	const p1 = row.part1 ?? "";
	const p2 = row.part2 ?? "";
	const c = String(row.chaptno ?? "");
	const s = String(row.slokano ?? "");
	return `${p1}|${p2}|${c}|${s}`;
}

export async function OPTIONS() {
	return NextResponse.json({}, { headers: corsHeaders() });
}

/**
 * GET /api/analysis/[book]/padacchedah
 * Returns all shlokas for the book with: slokano, chaptno, spart, padacchedah.
 * padacchedah = sentence texts with words in prose (anvaya_no) order.
 */
export async function GET(
	_request: Request,
	{ params }: { params: Params }
) {
	await dbConnect();

	const { book } = params;

	try {
		const [shlokas, analysisRows] = await Promise.all([
			AHShloka.find({ book })
				.sort({ part1: 1, part2: 1, chaptno: 1, slokano: 1 })
				.select("part1 part2 chaptno slokano spart")
				.lean(),
			Analysis.find({ book })
				.select("part1 part2 chaptno slokano sentno anvaya_no word")
				.lean(),
		]);

		const analysisByKey = new Map<
			string,
			{ sentno: string; anvaya_no?: string; word?: string }[]
		>();
		for (const row of analysisRows as any[]) {
			const key = analysisKey(row);
			if (!analysisByKey.has(key)) analysisByKey.set(key, []);
			analysisByKey.get(key)!.push({
				sentno: String(row.sentno ?? ""),
				anvaya_no: row.anvaya_no,
				word: row.word,
			});
		}

		const data: {
			slokano: string;
			chaptno: string;
			spart: string;
			padacchedah: string[];
		}[] = [];

		for (const shloka of shlokas as any[]) {
			const key = analysisKey(shloka);
			const rows = analysisByKey.get(key) ?? [];

			const grouped: Record<string, typeof rows> = {};
			for (const r of rows) {
				const k = String(r.sentno ?? "");
				if (!k) continue;
				if (!grouped[k]) grouped[k] = [];
				grouped[k].push(r);
			}

			const sentnos = Object.keys(grouped).sort(
				(a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0)
			);

			const padacchedah: string[] = [];
			for (const sentno of sentnos) {
				const group = grouped[sentno]
					.slice()
					.sort(sortByAnvaya);
				const words = group
					.map((r) => String(r?.word ?? "").trim())
					.filter((w) => w && w !== "-");
				padacchedah.push(joinWordsWithHyphenRule(words));
			}

			data.push({
				slokano: String(shloka.slokano ?? ""),
				chaptno: String(shloka.chaptno ?? ""),
				spart: String(shloka.spart ?? ""),
				padacchedah,
			});
		}

		return NextResponse.json(
			{ data },
			{ headers: corsHeaders() }
		);
	} catch (error) {
		console.error("Error fetching book padacchedah data:", error);
		return NextResponse.json(
			{
				message: "Internal Server Error",
				error: (error as Error).message,
			},
			{ status: 500, headers: corsHeaders() }
		);
	}
}
