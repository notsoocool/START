import { describe, expect, test } from "bun:test";
import {
	clusterLabel,
	compareSlokano,
	joinSparts,
	sentnoMaps,
} from "./shlokaCluster";

describe("compareSlokano", () => {
	test("orders by leading integer, then full string", () => {
		const sorted = ["052", "051-052", "051", "10"].sort(compareSlokano);
		expect(sorted).toEqual(["10", "051", "051-052", "052"]);
	});
});

describe("clusterLabel", () => {
	test("uses first and last after numeric sort", () => {
		expect(clusterLabel(["052", "051"])).toBe("051-052");
		expect(clusterLabel(["053", "051", "052"])).toBe("051-053");
	});

	test("rejects fewer than two values", () => {
		expect(() => clusterLabel(["051"])).toThrow("at least two");
	});

	test("rejects an existing cluster number", () => {
		expect(() => clusterLabel(["051-052", "053"])).toThrow("already clustered");
	});
});

describe("joinSparts", () => {
	test("joins trimmed texts with # and drops empties", () => {
		expect(joinSparts(["  अथ ", "", "द्वितीयः  "])).toBe("अथ#द्वितीयः");
	});
});

describe("sentnoMaps", () => {
	test("keeps each source sentence intact and shifts later sources", () => {
		const maps = sentnoMaps([
			{ sentnos: ["1", "1", "2"] },
			{ sentnos: ["1"] },
		]);
		expect(maps[0].get("1")).toBe("1");
		expect(maps[0].get("2")).toBe("2");
		expect(maps[1].get("1")).toBe("3");
	});
});
