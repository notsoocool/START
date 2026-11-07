import { createHash, randomBytes } from "crypto";

export function hashDeveloperKey(rawKey: string): string {
	return createHash("sha256").update(rawKey).digest("hex");
}

export function keyPrefixFromRaw(rawKey: string): string {
	return rawKey.slice(0, 12);
}

export function generateDeveloperKey(): {
	rawKey: string;
	keyHash: string;
	keyPrefix: string;
} {
	const rawKey = `sk_live_${randomBytes(24).toString("base64url")}`;
	return {
		rawKey,
		keyHash: hashDeveloperKey(rawKey),
		keyPrefix: keyPrefixFromRaw(rawKey),
	};
}
