import { describe, expect, test } from "bun:test";
import { decideExportAccess, extractBearerOrApiKey } from "./authorizeExport";

describe("extractBearerOrApiKey", () => {
	test("Bearer header wins", () => {
		const req = new Request("http://x", {
			headers: { Authorization: "Bearer sk_live_abc", "X-API-Key": "other" },
		});
		expect(extractBearerOrApiKey(req)).toBe("sk_live_abc");
	});

	test("X-API-Key used when Bearer missing", () => {
		const req = new Request("http://x", { headers: { "X-API-Key": "sk_live_abc" } });
		expect(extractBearerOrApiKey(req)).toBe("sk_live_abc");
	});

	test("returns null when neither header is set", () => {
		expect(extractBearerOrApiKey(new Request("http://x"))).toBe(null);
	});
});

describe("decideExportAccess", () => {
	test("Admin session may download anything including all", () => {
		expect(
			decideExportAccess({
				sessionRole: "Admin",
				book: "all",
				hasActiveKey: false,
				hasGrant: false,
			}).ok
		).toBe(true);
	});

	test("Developer key cannot use book=all", () => {
		const result = decideExportAccess({
			sessionRole: null,
			book: "all",
			hasActiveKey: true,
			hasGrant: true,
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.status).toBe(403);
	});

	test("Developer key without grant is forbidden", () => {
		const result = decideExportAccess({
			sessionRole: null,
			book: "ईशोपनिषद्",
			hasActiveKey: true,
			hasGrant: false,
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.status).toBe(403);
	});

	test("Developer key with grant is allowed", () => {
		expect(
			decideExportAccess({
				sessionRole: null,
				book: "ईशोपनिषद्",
				hasActiveKey: true,
				hasGrant: true,
			}).ok
		).toBe(true);
	});

	test("no session and no key is unauthorized", () => {
		const result = decideExportAccess({
			sessionRole: null,
			book: "x",
			hasActiveKey: false,
			hasGrant: false,
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.status).toBe(401);
	});
});
