/** Leading integer of a shloka number. "051-052" → 51. Non-numeric → null. */
export function leadingSlokano(slokano: string): number | null {
	const match = /^(\d+)/.exec(slokano.trim());
	if (!match) return null;
	return Number(match[1]);
}

export function compareSlokano(a: string, b: string): number {
	const na = leadingSlokano(a);
	const nb = leadingSlokano(b);
	if (na !== null && nb !== null && na !== nb) return na - nb;
	return a.localeCompare(b);
}

export function clusterLabel(slokanos: string[]): string {
	if (slokanos.length < 2) {
		throw new Error("Select at least two shlokas");
	}
	if (slokanos.some((value) => value.includes("-"))) {
		throw new Error("A selected shloka is already clustered");
	}
	const sorted = [...slokanos].sort(compareSlokano);
	return `${sorted[0]}-${sorted[sorted.length - 1]}`;
}

export function joinSparts(sparts: string[]): string {
	return sparts
		.map((part) => part.trim())
		.filter((part) => part.length > 0)
		.join("#");
}

/**
 * Maps each source's existing sentno values onto a fresh sequence.
 * Rows that share a sentno inside one source still share one sentno.
 * The next source starts after the previous source's last sentence.
 */
export function sentnoMaps(sources: { sentnos: string[] }[]): Map<string, string>[] {
	let next = 1;
	return sources.map((source) => {
		const unique = [...new Set(source.sentnos)].sort((a, b) => {
			const na = Number(a);
			const nb = Number(b);
			if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
			return a.localeCompare(b);
		});
		const map = new Map<string, string>();
		for (const sentno of unique) {
			map.set(sentno, String(next));
			next += 1;
		}
		return map;
	});
}
