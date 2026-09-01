/**
 * Utilities for presenting the `kaaraka_sambandha` field as UI columns without
 * changing the underlying DB storage.
 *
 * The DB stores `kaaraka_sambandha` as a single string. Multiple pairs are
 * joined by `;`, and each pair uses `,` between the relation label and the
 * anvaya index it points to. Example: "कर्ता,4.1;कर्म,5.2".
 *
 * The first pair is shown as Kaaraka Relation + To Index.
 * The second pair (after `;`) is shown as Discourse Relation + To Index.
 */

export interface KaarakaPair {
	relation: string;
	toIndex: string;
}

export interface SplitKaarakaPairs {
	kaaraka: KaarakaPair;
	discourse: KaarakaPair;
}

const emptyPair = (): KaarakaPair => ({ relation: "", toIndex: "" });

/**
 * Parses `kaaraka_sambandha` into the first (kaaraka) and second (discourse)
 * relation pairs.
 */
export const splitKaarakaSambandha = (value: unknown): SplitKaarakaPairs => {
	if (typeof value !== "string" || value.trim() === "") {
		return { kaaraka: emptyPair(), discourse: emptyPair() };
	}

	const parsePair = (segment: string): KaarakaPair => {
		const [relation = "", toIndex = ""] = segment.split(",");
		return {
			relation: relation.trim(),
			toIndex: toIndex.trim(),
		};
	};

	const segments = value.split(";");
	return {
		kaaraka: parsePair(segments[0] ?? ""),
		discourse: parsePair(segments[1] ?? ""),
	};
};

/**
 * Recombines kaaraka and discourse pairs back into DB storage format.
 * Fully empty pairs are dropped.
 */
export const combineKaarakaSambandha = (
	kaaraka: KaarakaPair,
	discourse: KaarakaPair = emptyPair()
): string => {
	const formatPair = (pair: KaarakaPair) => {
		const relation = (pair.relation ?? "").trim();
		const toIndex = (pair.toIndex ?? "").trim();
		if (!relation && !toIndex) return null;
		return `${relation},${toIndex}`;
	};

	return [formatPair(kaaraka), formatPair(discourse)]
		.filter(Boolean)
		.join(";");
};
