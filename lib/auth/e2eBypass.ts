import { NextRequest } from "next/server";

/** Fixed local-only identity. Never used in production. */
export const E2E_BYPASS_USER_ID = "user_e2e_bypass_local_only";
export const E2E_BYPASS_COOKIE = "start_e2e_bypass";

/**
 * Hard gates so this cannot accidentally run on Vercel production.
 * All of these must pass.
 */
export function isE2EBypassAllowedByEnv(): boolean {
	if (process.env.ALLOW_E2E_BYPASS !== "1") return false;
	if (process.env.NODE_ENV === "production") return false;
	if (process.env.VERCEL_ENV === "production") return false;
	if (process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "development") {
		// Any non-dev Vercel deployment (preview/prod) — refuse.
		// Preview still should not get this bypass.
		if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "production") {
			return false;
		}
	}
	const secret = process.env.E2E_BYPASS_SECRET || "";
	if (secret.length < 32) return false;
	return true;
}

export function e2eBypassSecret(): string | null {
	if (!isE2EBypassAllowedByEnv()) return null;
	return process.env.E2E_BYPASS_SECRET || null;
}

/** Constant-time-ish compare for local secrets. */
export function secretsMatch(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let out = 0;
	for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return out === 0;
}

export function requestHasValidE2EBypass(req: Request | NextRequest): boolean {
	const secret = e2eBypassSecret();
	if (!secret) return false;

	const header = req.headers.get("x-e2e-bypass")?.trim() || "";
	if (header && secretsMatch(header, secret)) return true;

	const cookieHeader = req.headers.get("cookie") || "";
	const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${E2E_BYPASS_COOKIE}=([^;]*)`));
	const cookieVal = match ? decodeURIComponent(match[1]) : "";
	if (cookieVal && secretsMatch(cookieVal, secret)) return true;

	return false;
}

export function e2eBypassUser() {
	return {
		userId: E2E_BYPASS_USER_ID,
		name: "E2E Bypass (local only)",
		firstName: "E2E",
		lastName: "Bypass",
		perms: "Root" as const,
	};
}
