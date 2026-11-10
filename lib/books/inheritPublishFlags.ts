import AHShloka from "@/lib/db/newShlokaModel";

export type InheritedPublishFlags = {
	userPublished: boolean;
	groupPublished: boolean;
	locked: boolean;
	owner: string | null;
};

type Scope = {
	book: string;
	part1?: string | null;
	part2?: string | null;
	chaptno?: string | null;
};

const EMPTY: InheritedPublishFlags = {
	userPublished: false,
	groupPublished: false,
	locked: false,
	owner: null,
};

async function aggregateFlags(match: Record<string, unknown>): Promise<InheritedPublishFlags | null> {
	const rows = await AHShloka.aggregate([
		{ $match: match },
		{
			$group: {
				_id: null,
				count: { $sum: 1 },
				// Any published/locked in scope → new rows inherit it (avoids re-publishing after adds)
				userPublished: { $max: { $cond: [{ $eq: ["$userPublished", true] }, 1, 0] } },
				groupPublished: { $max: { $cond: [{ $eq: ["$groupPublished", true] }, 1, 0] } },
				locked: { $max: { $cond: [{ $eq: ["$locked", true] }, 1, 0] } },
			},
		},
	]);

	if (!rows.length || !rows[0].count) return null;

	const row = rows[0];
	const withOwner = (await AHShloka.findOne({
		...match,
		owner: { $nin: [null, ""] },
	})
		.select("owner")
		.lean()) as { owner?: string | null } | null;

	return {
		userPublished: row.userPublished === 1,
		groupPublished: row.groupPublished === 1,
		locked: row.locked === 1,
		owner: withOwner?.owner ?? null,
	};
}

/**
 * New shlokas inherit publish/lock from the book (and chapter when present).
 * Uses "any true" so a published book keeps new rows published — no re-publish after adds.
 */
export async function inheritPublishFlags(scope: Scope): Promise<InheritedPublishFlags> {
	const { book, part1 = null, part2 = null, chaptno = null } = scope;
	if (!book) return EMPTY;

	const bookFlags = await aggregateFlags({ book });
	let chapterFlags: InheritedPublishFlags | null = null;
	if (chaptno != null && chaptno !== "") {
		chapterFlags = await aggregateFlags({
			book,
			part1,
			part2,
			chaptno,
		});
	}

	if (!bookFlags && !chapterFlags) return EMPTY;

	return {
		userPublished: Boolean(chapterFlags?.userPublished || bookFlags?.userPublished),
		groupPublished: Boolean(chapterFlags?.groupPublished || bookFlags?.groupPublished),
		locked: Boolean(chapterFlags?.locked || bookFlags?.locked),
		owner: chapterFlags?.owner || bookFlags?.owner || null,
	};
}
