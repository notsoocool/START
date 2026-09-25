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

export const CLUSTER_UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Undo stays available for 24 hours after clusteredAt.
 * A missing timestamp keeps undo available, because the combine time is unknown.
 */
export function isClusterUndoOpen(
	clusteredAt: Date | string | null | undefined,
	now = Date.now()
): boolean {
	if (clusteredAt == null || clusteredAt === "") return true;
	const combinedAt = new Date(clusteredAt).getTime();
	if (!Number.isFinite(combinedAt)) return true;
	return now - combinedAt < CLUSTER_UNDO_WINDOW_MS;
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
export type SentnoMove = { from: string; to: string; rows: number };

export type ClusterSourceSnapshot = {
	slokano: string;
	spart: string;
	userPublished: boolean;
	groupPublished: boolean;
	locked: boolean;
	owner: string | null;
	sentnoMap: SentnoMove[];
};

type UndoSource = {
	slokano: string;
	spart: string;
	userPublished?: boolean;
	groupPublished?: boolean;
	locked?: boolean;
	owner?: string | null;
	sentnos: string[];
};

/** Records each source shloka and how its sentence numbers were shifted, so a cluster can be split apart again. */
export function buildClusterUndo(sources: UndoSource[], maps: Map<string, string>[]): ClusterSourceSnapshot[] {
	if (sources.length !== maps.length) {
		throw new Error("Undo snapshot requires one sentence map per shloka");
	}

	return sources.map((source, index) => {
		const counts = new Map<string, number>();
		for (const sentno of source.sentnos) {
			counts.set(sentno, (counts.get(sentno) ?? 0) + 1);
		}

		const sentnoMap = Array.from(maps[index].entries()).map(([from, to]) => ({
			from,
			to,
			rows: counts.get(from) ?? 0,
		}));

		return {
			slokano: source.slokano,
			spart: source.spart,
			userPublished: source.userPublished === true,
			groupPublished: source.groupPublished === true,
			locked: source.locked === true,
			owner: source.owner ?? null,
			sentnoMap,
		};
	});
}

export function sentnoMaps(sources: { sentnos: string[] }[]): Map<string, string>[] {
	let next = 1;
	return sources.map((source) => {
		const unique = Array.from(new Set(source.sentnos)).sort((a, b) => {
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
