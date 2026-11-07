import { NextRequest, NextResponse } from "next/server";
import { requirePerms } from "@/lib/auth/requirePerms";
import ApiKey from "@/lib/db/apiKeyModel";
import { generateDeveloperKey } from "@/lib/api/developerKey";

export const dynamic = "force-dynamic";

const ALLOWED = ["Developer", "Admin", "Root"];

export async function GET(req: NextRequest) {
	const auth = await requirePerms(ALLOWED, req);
	if (auth instanceof NextResponse) return auth;

	const latest = await ApiKey.findOne({ userId: auth.userId }).sort({ createdAt: -1 });
	if (!latest) {
		return NextResponse.json({ status: "none" });
	}

	return NextResponse.json({
		status: latest.status,
		keyPrefix: latest.keyPrefix,
		createdAt: latest.createdAt,
		lastUsedAt: latest.lastUsedAt,
		revokedAt: latest.revokedAt,
	});
}

export async function POST(req: NextRequest) {
	const auth = await requirePerms(ALLOWED, req);
	if (auth instanceof NextResponse) return auth;

	await ApiKey.updateMany(
		{ userId: auth.userId, status: "active" },
		{ $set: { status: "revoked", revokedAt: new Date() } }
	);

	const { rawKey, keyHash, keyPrefix } = generateDeveloperKey();
	const created = await ApiKey.create({
		userId: auth.userId,
		keyPrefix,
		keyHash,
		status: "active",
	});

	return NextResponse.json({
		rawKey,
		keyPrefix,
		createdAt: created.createdAt,
	});
}

export async function DELETE(req: NextRequest) {
	const auth = await requirePerms(ALLOWED, req);
	if (auth instanceof NextResponse) return auth;

	const result = await ApiKey.updateMany(
		{ userId: auth.userId, status: "active" },
		{ $set: { status: "revoked", revokedAt: new Date() } }
	);

	return NextResponse.json({
		success: true,
		revokedCount: result.modifiedCount,
	});
}
