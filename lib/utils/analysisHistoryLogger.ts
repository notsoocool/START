import dbConnect from "@/lib/db/connect";
import AnalysisHistory from "@/lib/db/analysisHistoryModel";
import { currentUser } from "@clerk/nextjs/server";

const ROW_FIELDS = [
	"anvaya_no",
	"word",
	"poem",
	"sandhied_word",
	"morph_analysis",
	"morph_in_context",
	"kaaraka_sambandha",
	"possible_relations",
	"bgcolor",
	"name_classification",
	"sarvanAma",
	"prayoga",
	"samAsa",
	"english_meaning",
	"hindi_meaning",
	"sentno",
];

function toPlainRow(doc: Record<string, unknown>): Record<string, unknown> {
	const row: Record<string, unknown> = {};
	for (const k of ROW_FIELDS) {
		let v = doc[k];
		if (v instanceof Map) v = Object.fromEntries(v);
		if (v !== undefined && v !== null) row[k] = v;
	}
	return row;
}

export async function logAnalysisEdit(params: {
	location: { book: string; part1?: string; part2?: string; chaptno: string; slokano: string };
	oldRow: Record<string, unknown>;
	newRow: Record<string, unknown>;
}) {
	try {
		await dbConnect();
		const user = await currentUser();
		if (!user) return null;

		const changedFields = ROW_FIELDS.filter(
			(f) => JSON.stringify(params.oldRow[f]) !== JSON.stringify(params.newRow[f])
		);
		if (changedFields.length === 0) return null;

		const userName = user.firstName ? `${user.firstName} ${user.lastName || ""}` : user.username || "Unknown User";

		await AnalysisHistory.create({
			action: "edit",
			userId: user.id,
			userName,
			location: params.location,
			row: toPlainRow(params.newRow),
			oldRow: toPlainRow(params.oldRow),
			changedFields,
		});
	} catch (e) {
		console.error("Error logging analysis edit:", e);
	}
}

export async function logAnalysisAdd(params: {
	location: { book: string; part1?: string; part2?: string; chaptno: string; slokano: string };
	row: Record<string, unknown>;
}) {
	try {
		await dbConnect();
		const user = await currentUser();
		if (!user) return null;

		const userName = user.firstName ? `${user.firstName} ${user.lastName || ""}` : user.username || "Unknown User";

		await AnalysisHistory.create({
			action: "add",
			userId: user.id,
			userName,
			location: params.location,
			row: toPlainRow(params.row),
		});
	} catch (e) {
		console.error("Error logging analysis add:", e);
	}
}

export async function logAnalysisDelete(params: {
	location: { book: string; part1?: string; part2?: string; chaptno: string; slokano: string };
	row: Record<string, unknown>;
}) {
	try {
		await dbConnect();
		const user = await currentUser();
		if (!user) return null;

		const userName = user.firstName ? `${user.firstName} ${user.lastName || ""}` : user.username || "Unknown User";

		await AnalysisHistory.create({
			action: "delete",
			userId: user.id,
			userName,
			location: params.location,
			row: toPlainRow(params.row),
		});
	} catch (e) {
		console.error("Error logging analysis delete:", e);
	}
}
