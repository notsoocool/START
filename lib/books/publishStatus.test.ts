import { describe, expect, test } from "bun:test";
import {
	aggregateFlag,
	aggregatePublishStatus,
	rollupPublishStatus,
} from "./publishStatus";

describe("aggregateFlag", () => {
	test("empty → all false", () => {
		expect(aggregateFlag([])).toEqual({ all: false, any: false });
	});

	test("all true", () => {
		expect(aggregateFlag([true, true])).toEqual({ all: true, any: true });
	});

	test("mixed → not all", () => {
		expect(aggregateFlag([true, false])).toEqual({ all: false, any: true });
	});
});

describe("aggregatePublishStatus", () => {
	test("collects all distinct owners", () => {
		const status = aggregatePublishStatus([
			{ userPublished: false, groupPublished: false, locked: false, owner: "u1" },
			{ userPublished: false, groupPublished: false, locked: false, owner: "u2" },
			{ userPublished: false, groupPublished: false, locked: false, owner: "u1" },
			{ userPublished: false, groupPublished: false, locked: false, owner: null },
		]);
		expect(status.owners).toEqual(["u1", "u2"]);
		expect(status.owner).toBe("u1");
	});
});

describe("rollupPublishStatus", () => {
	test("unions owners across chapters", () => {
		const book = rollupPublishStatus([
			{
				userPublished: false,
				groupPublished: false,
				locked: false,
				owners: ["a"],
				owner: "a",
			},
			{
				userPublished: false,
				groupPublished: false,
				locked: false,
				owners: ["b", "a"],
				owner: "b",
			},
		]);
		expect(book.owners).toEqual(["a", "b"]);
	});
});
