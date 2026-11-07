/** Aggregate boolean flags: published means every row is true (book/chapter is uniform). */
export function aggregateFlag(values: Array<boolean | null | undefined>): {
	all: boolean;
	any: boolean;
} {
	const normalized = values.map((v) => Boolean(v));
	if (normalized.length === 0) {
		return { all: false, any: false };
	}
	const any = normalized.some(Boolean);
	const all = normalized.every(Boolean);
	return { all, any };
}

function uniqOwners(
	values: Array<string | null | undefined | string[]>
): string[] {
	const set = new Set<string>();
	for (const v of values) {
		if (Array.isArray(v)) {
			for (const id of v) {
				if (typeof id === "string" && id && id !== "none") set.add(id);
			}
		} else if (typeof v === "string" && v && v !== "none") {
			set.add(v);
		}
	}
	return Array.from(set).sort();
}

export type PublishStatus = {
	userPublished: boolean;
	groupPublished: boolean;
	locked: boolean;
	/** All distinct owners who added shlokas in this scope (Admin private marker). */
	owners: string[];
	/** @deprecated prefer owners — first id for older callers */
	owner: string | null;
};

export function aggregatePublishStatus(
	rows: Array<{
		userPublished?: boolean | null;
		groupPublished?: boolean | null;
		locked?: boolean | null;
		owner?: string | null;
		owners?: string[] | null;
	}>
): PublishStatus {
	const user = aggregateFlag(rows.map((r) => r.userPublished));
	const group = aggregateFlag(rows.map((r) => r.groupPublished));
	const locked = aggregateFlag(rows.map((r) => r.locked));
	const owners = uniqOwners(rows.map((r) => r.owners ?? r.owner));

	return {
		userPublished: user.all,
		groupPublished: group.all,
		locked: locked.all,
		owners,
		owner: owners[0] || null,
	};
}

/** Roll chapter statuses up to book: every chapter must be fully on. */
export function rollupPublishStatus(chapterStatuses: PublishStatus[]): PublishStatus {
	if (chapterStatuses.length === 0) {
		return {
			userPublished: false,
			groupPublished: false,
			locked: false,
			owners: [],
			owner: null,
		};
	}

	const owners = uniqOwners(chapterStatuses.map((c) => c.owners ?? c.owner));
	return {
		userPublished: chapterStatuses.every((c) => c.userPublished),
		groupPublished: chapterStatuses.every((c) => c.groupPublished),
		locked: chapterStatuses.every((c) => c.locked),
		owners,
		owner: owners[0] || null,
	};
}
