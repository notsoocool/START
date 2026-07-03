/**
 * Utilities for presenting the `kaaraka_sambandha` field as two logical
 * columns (relation + to-index) without changing the underlying DB storage.
 *
 * The DB stores `kaaraka_sambandha` as a single string. Multiple pairs are
 * joined by `;`, and each pair uses `,` between the relation label and the
 * anvaya index it points to. Example: "कर्ता,4.1;कर्म,5.2".
 */

export interface SplitKaaraka {
	relations: string;
	toIndexes: string;
}

/**
 * Splits a `kaaraka_sambandha` string into two parallel `;`-separated strings:
 * one for the relations and one for the `to_index` targets.
 *
 * Empty / missing halves are preserved so the two outputs stay index-aligned.
 */
export const splitKaarakaSambandha = (value: unknown): SplitKaaraka => {
	if (typeof value !== "string" || value.trim() === "") {
		return { relations: "", toIndexes: "" };
	}

	const pairs = value.split(";");
	const relations: string[] = [];
	const toIndexes: string[] = [];

	for (const pair of pairs) {
		const [rel = "", idx = ""] = pair.split(",");
		relations.push(rel.trim());
		toIndexes.push(idx.trim());
	}

	return {
		relations: relations.join(";"),
		toIndexes: toIndexes.join(";"),
	};
};

/**
 * Recombines the two `;`-separated halves back into the DB storage format
 * (`relation,to_index` pairs joined by `;`). Fully empty pairs are dropped.
 */
export const combineKaarakaSambandha = (
	relations: string,
	toIndexes: string
): string => {
	const rels = (relations ?? "").split(";");
	const idxs = (toIndexes ?? "").split(";");
	const max = Math.max(rels.length, idxs.length);
	const combined: string[] = [];

	for (let i = 0; i < max; i++) {
		const r = (rels[i] ?? "").trim();
		const x = (idxs[i] ?? "").trim();
		if (!r && !x) continue;
		combined.push(`${r},${x}`);
	}

	return combined.join(";");
};
