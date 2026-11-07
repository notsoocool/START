import { describe, expect, test } from "bun:test";
import {
	partitionSentnos,
	spartParts,
	splitSpart,
	suggestNextSlokano,
} from "./shlokaSplit";

describe("splitSpart", () => {
	test("cuts after the first line (26b + 27a style)", () => {
		const spart =
			"श्वेता ज्योतिष्मती चैव हरितालं मनःशिला।।२६।।#गन्धाश्चागुरुपत्राद्या धूमं मूर्धविरेचने [१] ।२७।";
		expect(splitSpart(spart, 0)).toEqual({
			first: "श्वेता ज्योतिष्मती चैव हरितालं मनःशिला।।२६।।",
			second: "गन्धाश्चागुरुपत्राद्या धूमं मूर्धविरेचने [१] ।२७।",
		});
	});

	test("rejects a single part", () => {
		expect(() => splitSpart("only one", 0)).toThrow("at least two");
	});

	test("rejects a cut that leaves an empty side", () => {
		expect(() => splitSpart("a#b", 1)).toThrow("Cut must leave");
	});
});

describe("suggestNextSlokano", () => {
	test("increments padded numbers", () => {
		expect(suggestNextSlokano("026")).toBe("027");
		expect(suggestNextSlokano("26")).toBe("27");
	});

	test("uses the last digit run on a cluster label", () => {
		expect(suggestNextSlokano("026-027")).toBe("028");
	});
});

describe("partitionSentnos", () => {
	test("keeps all when no cut", () => {
		expect(partitionSentnos(["2", "1", "1"], null)).toEqual({
			keep: ["1", "2"],
			move: [],
		});
	});

	test("moves sentences after the cut", () => {
		expect(partitionSentnos(["1", "2", "3"], "1")).toEqual({
			keep: ["1"],
			move: ["2", "3"],
		});
	});
});

describe("spartParts", () => {
	test("splits on #", () => {
		expect(spartParts("a#b#c")).toEqual(["a", "b", "c"]);
	});
});
