/**
 * Split an imported/mixed śloka card into two at a `#`-separated text boundary.
 * Optional sentence cut moves later analysis rows onto the new śloka number.
 */

export function spartParts(spart: string): string[] {
	return String(spart ?? "").split("#");
}

/**
 * Keep parts[0..cutAfterPartIndex] on the first card; the rest become the second.
 * Requires at least two parts and a cut that leaves both sides non-empty.
 */
export function splitSpart(
	spart: string,
	cutAfterPartIndex: number
): { first: string; second: string } {
	const parts = spartParts(spart);
	if (parts.length < 2) {
		throw new Error("Need at least two text parts (separated by #) to split");
	}
	if (
		!Number.isInteger(cutAfterPartIndex) ||
		cutAfterPartIndex < 0 ||
		cutAfterPartIndex >= parts.length - 1
	) {
		throw new Error("Cut must leave at least one text part on each śloka");
	}
	return {
		first: parts.slice(0, cutAfterPartIndex + 1).join("#"),
		second: parts.slice(cutAfterPartIndex + 1).join("#"),
	};
}

/** Suggest the next padded number after the last digit run in `slokano`. "026" → "027". */
export function suggestNextSlokano(slokano: string): string {
	const match = /(\d+)(?!.*\d)/.exec(String(slokano).trim());
	if (!match) return "";
	const raw = match[1];
	const next = String(Number(raw) + 1);
	const padded = next.padStart(raw.length, "0");
	return padded;
}

function compareSentno(a: string, b: string): number {
	const na = Number(a);
	const nb = Number(b);
	if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
	return a.localeCompare(b);
}

/**
 * Partition unique sentnos. Sentnos up to and including `cutAfterSentno` stay;
 * later ones move. If cut is null/empty, all stay (text-only split).
 */
export function partitionSentnos(
	sentnos: string[],
	cutAfterSentno: string | null | undefined
): { keep: string[]; move: string[] } {
	const unique = Array.from(new Set(sentnos.map(String))).sort(compareSentno);
	if (!cutAfterSentno) {
		return { keep: unique, move: [] };
	}
	const cut = String(cutAfterSentno);
	if (!unique.includes(cut)) {
		throw new Error(`Sentence ${cut} was not found on this śloka`);
	}
	const keep: string[] = [];
	const move: string[] = [];
	for (const sentno of unique) {
		if (compareSentno(sentno, cut) <= 0) keep.push(sentno);
		else move.push(sentno);
	}
	return { keep, move };
}
