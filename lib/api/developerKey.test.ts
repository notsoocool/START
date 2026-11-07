import { describe, expect, test } from "bun:test";
import {
	generateDeveloperKey,
	hashDeveloperKey,
	keyPrefixFromRaw,
} from "./developerKey";

describe("generateDeveloperKey", () => {
	test("returns a sk_live_ secret, matching hash, and prefix", () => {
		const { rawKey, keyHash, keyPrefix } = generateDeveloperKey();
		expect(rawKey.startsWith("sk_live_")).toBe(true);
		expect(rawKey.length).toBeGreaterThanOrEqual(40);
		expect(keyHash).toBe(hashDeveloperKey(rawKey));
		expect(keyPrefix).toBe(keyPrefixFromRaw(rawKey));
		expect(keyPrefix.length).toBeGreaterThanOrEqual(10);
	});

	test("two generations differ", () => {
		const a = generateDeveloperKey();
		const b = generateDeveloperKey();
		expect(a.rawKey).not.toBe(b.rawKey);
		expect(a.keyHash).not.toBe(b.keyHash);
	});
});

describe("hashDeveloperKey", () => {
	test("is stable and not the raw key", () => {
		const raw = "sk_live_test_value_for_hash";
		expect(hashDeveloperKey(raw)).toBe(hashDeveloperKey(raw));
		expect(hashDeveloperKey(raw)).not.toBe(raw);
	});
});
