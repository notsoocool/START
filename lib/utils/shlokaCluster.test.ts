import { describe, expect, test } from "bun:test";
import {
	buildClusterUndo,
	CLUSTER_UNDO_WINDOW_MS,
	clusterLabel,
	compareSlokano,
	isClusterUndoOpen,
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

describe("isClusterUndoOpen", () => {
	test("closes once 24 hours have passed and stays open when the time is unknown", () => {
		const start = Date.parse("2026-09-25T10:00:00.000Z");
		expect(isClusterUndoOpen(new Date(start), start + CLUSTER_UNDO_WINDOW_MS - 1)).toBe(true);
		expect(isClusterUndoOpen(new Date(start), start + CLUSTER_UNDO_WINDOW_MS)).toBe(false);
		expect(isClusterUndoOpen(null, start)).toBe(true);
	});
});

describe("buildClusterUndo", () => {
	test("stores each source and how many rows moved with each sentence number", () => {
		const sentnos = [["1", "1"], ["1"]];
		const maps = sentnoMaps(sentnos.map((group) => ({ sentnos: group })));
		const undo = buildClusterUndo(
			[
				{ slokano: "051", spart: "अथ", sentnos: sentnos[0], locked: true, owner: "user_1" },
				{ slokano: "052", spart: "द्वितीयः", sentnos: sentnos[1] },
			],
			maps
		);

		expect(undo[0]).toEqual({
			slokano: "051",
			spart: "अथ",
			userPublished: false,
			groupPublished: false,
			locked: true,
			owner: "user_1",
			sentnoMap: [{ from: "1", to: "1", rows: 2 }],
		});
		expect(undo[1].sentnoMap).toEqual([{ from: "1", to: "2", rows: 1 }]);
		expect(undo[1].locked).toBe(false);
		expect(undo[1].owner).toBe(null);
	});
});
