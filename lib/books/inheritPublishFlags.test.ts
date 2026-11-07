import { describe, expect, test } from "bun:test";

/**
 * Pure mirror of the aggregate "any true" rule used by inheritPublishFlags,
 * so we can lock the intended behavior without a live Mongo.
 */
function inheritFromRows(
	rows: Array<{ userPublished?: boolean; groupPublished?: boolean; locked?: boolean; owner?: string | null }>
) {
	if (rows.length === 0) {
		return { userPublished: false, groupPublished: false, locked: false, owner: null as string | null };
	}
	return {
		userPublished: rows.some((r) => r.userPublished === true),
		groupPublished: rows.some((r) => r.groupPublished === true),
		locked: rows.some((r) => r.locked === true),
		owner: rows.map((r) => r.owner).find((o) => typeof o === "string" && o) || null,
	};
}

describe("inherit publish flags rule", () => {
	test("empty scope → all false", () => {
		expect(inheritFromRows([])).toEqual({
			userPublished: false,
			groupPublished: false,
			locked: false,
			owner: null,
		});
	});

	test("published book → new shloka inherits userPublished", () => {
		const flags = inheritFromRows([
			{ userPublished: true, groupPublished: true, locked: false, owner: "u1" },
			{ userPublished: true, groupPublished: true, locked: false, owner: "u1" },
		]);
		expect(flags.userPublished).toBe(true);
		expect(flags.groupPublished).toBe(true);
		expect(flags.owner).toBe("u1");
	});

	test("mixed book still inherits published when any row is published", () => {
		const flags = inheritFromRows([
			{ userPublished: true, groupPublished: false, locked: false, owner: "u1" },
			{ userPublished: false, groupPublished: false, locked: false, owner: "u1" },
		]);
		expect(flags.userPublished).toBe(true);
		expect(flags.groupPublished).toBe(false);
	});

	test("unpublished book stays unpublished", () => {
		const flags = inheritFromRows([
			{ userPublished: false, groupPublished: false, locked: false, owner: "u1" },
		]);
		expect(flags.userPublished).toBe(false);
		expect(flags.groupPublished).toBe(false);
	});
});
