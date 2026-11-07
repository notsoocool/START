import { currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db/connect";
import Perms from "@/lib/db/permissionsModel";
import ApiKey from "@/lib/db/apiKeyModel";
import ApiBookGrant from "@/lib/db/apiBookGrantModel";
import { hashDeveloperKey } from "@/lib/api/developerKey";
import { e2eBypassUser, requestHasValidE2EBypass } from "@/lib/auth/e2eBypass";

export type ExportAuth =
	| { kind: "session"; userId: string }
	| { kind: "apiKey"; userId: string; keyPrefix: string; keyId: string };

export type ExportAuthFailure = { error: string; status: number };

export function extractBearerOrApiKey(req: Request): string | null {
	const auth = req.headers.get("authorization");
	if (auth?.toLowerCase().startsWith("bearer ")) {
		const token = auth.slice(7).trim();
		if (token) return token;
	}
	const apiKey = req.headers.get("x-api-key")?.trim();
	return apiKey || null;
}

export function decideExportAccess(input: {
	sessionRole: string | null;
	book: string;
	hasActiveKey: boolean;
	hasGrant: boolean;
}): { ok: true } | { ok: false; status: number; error: string } {
	if (input.sessionRole === "Admin" || input.sessionRole === "Root") {
		return { ok: true };
	}
	if (!input.hasActiveKey) {
		return { ok: false, status: 401, error: "Unauthorized - API key or Admin session required" };
	}
	if (input.book === "all") {
		return { ok: false, status: 403, error: "Developer keys cannot download all books" };
	}
	if (!input.hasGrant) {
		return { ok: false, status: 403, error: "No approved access for this book" };
	}
	return { ok: true };
}

export async function authorizeExport(
	req: Request,
	book: string
): Promise<ExportAuth | ExportAuthFailure> {
	await dbConnect();

	// Prefer explicit API key auth whenever a key header is present.
	// Local E2E bypass cookies must NOT upgrade key downloads to Root/session
	// access (that would skip per-book grants).
	const rawKey = extractBearerOrApiKey(req);
	if (rawKey) {
		const keyHash = hashDeveloperKey(rawKey);
		const apiKey = await ApiKey.findOne({ keyHash, status: "active" });
		if (!apiKey) {
			return { error: "Unauthorized - Invalid API key", status: 401 };
		}

		if (book === "all") {
			return { error: "Developer keys cannot download all books", status: 403 };
		}

		const grant = await ApiBookGrant.findOne({
			userId: apiKey.userId,
			book,
			revokedAt: null,
		});
		if (!grant) {
			return { error: "No approved access for this book", status: 403 };
		}

		void ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } }).catch(
			() => {}
		);

		return {
			kind: "apiKey",
			userId: apiKey.userId,
			keyPrefix: apiKey.keyPrefix,
			keyId: String(apiKey._id),
		};
	}

	if (requestHasValidE2EBypass(req)) {
		const bypass = e2eBypassUser();
		return { kind: "session", userId: bypass.userId };
	}

	const user = await currentUser();
	if (user) {
		const perms = await Perms.findOne({ userID: user.id });
		if (perms && (perms.perms === "Admin" || perms.perms === "Root")) {
			return { kind: "session", userId: user.id };
		}
	}

	return { error: "Unauthorized - API key or Admin session required", status: 401 };
}
