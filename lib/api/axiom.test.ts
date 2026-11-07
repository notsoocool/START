import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { logApiAccess } from "./axiom";

describe("logApiAccess", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		process.env.AXIOM_TOKEN = "test-token";
		process.env.AXIOM_DATASET = "start-api-access";
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		delete process.env.AXIOM_TOKEN;
		delete process.env.AXIOM_DATASET;
	});

	test("posts the event to Axiom when env is set", async () => {
		const calls: unknown[] = [];
		globalThis.fetch = mock(async (url: any, init?: any) => {
			calls.push({ url: String(url), body: init?.body });
			return new Response(null, { status: 200 });
		}) as any;

		await logApiAccess({
			userId: "user_1",
			keyPrefix: "sk_live_abcd",
			book: "ईशोपनिषद्",
			route: "/api/download",
			status: 200,
			ip: "1.2.3.4",
			userAgent: "curl",
			durationMs: 12,
		});

		expect(calls.length).toBe(1);
		expect(String((calls[0] as any).url)).toContain("start-api-access");
		expect(String((calls[0] as any).body)).toContain("user_1");
	});

	test("no-ops when token is missing", async () => {
		delete process.env.AXIOM_TOKEN;
		let called = false;
		globalThis.fetch = mock(async () => {
			called = true;
			return new Response(null, { status: 200 });
		}) as any;
		await logApiAccess({
			userId: "user_1",
			keyPrefix: "sk_live_abcd",
			book: "x",
			route: "/api/download",
			status: 200,
			ip: null,
			userAgent: null,
			durationMs: 1,
		});
		expect(called).toBe(false);
	});
});
