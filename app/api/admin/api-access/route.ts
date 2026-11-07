import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requirePerms } from "@/lib/auth/requirePerms";
import ApiAccessRequest from "@/lib/db/apiAccessRequestModel";
import ApiBookGrant from "@/lib/db/apiBookGrantModel";
import ApiKey from "@/lib/db/apiKeyModel";
import Perms from "@/lib/db/permissionsModel";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const auth = await requirePerms(["Admin", "Root"], req);
	if (auth instanceof NextResponse) return auth;

	const status = req.nextUrl.searchParams.get("status") || "pending";
	const query =
		status === "all" ? {} : status === "pending" ? { status: "pending" } : { status };

	const requests = await ApiAccessRequest.find(query).sort({ createdAt: -1 }).limit(200).lean();
	const userIds = Array.from(new Set(requests.map((r) => r.userId)));
	const keys = await ApiKey.find({ userId: { $in: userIds } }).sort({ createdAt: -1 }).lean();
	const keyByUser = new Map<string, (typeof keys)[number]>();
	for (const key of keys) {
		if (!keyByUser.has(key.userId)) keyByUser.set(key.userId, key);
	}

	// Active grants are independent of the request status filter. Previously we
	// only loaded grants for users in the current request list — after Approve,
	// the filter stayed on "pending", the request vanished, userIds went empty,
	// and the UI falsely showed "No active grants".
	const grants = await ApiBookGrant.find({ revokedAt: null })
		.sort({ grantedAt: -1 })
		.limit(500)
		.lean();

	const grantUserIds = Array.from(new Set(grants.map((g) => g.userId)));
	const nameIds = Array.from(new Set([...userIds, ...grantUserIds]));
	const [permsRows, requestNameRows] = await Promise.all([
		Perms.find({ userID: { $in: nameIds } })
			.select("userID name")
			.lean(),
		ApiAccessRequest.find({ userId: { $in: nameIds } })
			.select("userId userName createdAt")
			.sort({ createdAt: -1 })
			.lean(),
	]);
	const nameByUser = new Map<string, string>();
	for (const row of requestNameRows) {
		if (!nameByUser.has(row.userId) && row.userName) {
			nameByUser.set(row.userId, row.userName);
		}
	}
	for (const row of permsRows) {
		if (row.name) nameByUser.set(row.userID, row.name);
	}

	return NextResponse.json({
		requests: requests.map((r) => ({
			...r,
			userName: r.userName || nameByUser.get(r.userId) || r.userId,
			key: keyByUser.get(r.userId)
				? {
						status: keyByUser.get(r.userId)!.status,
						keyPrefix: keyByUser.get(r.userId)!.keyPrefix,
						lastUsedAt: keyByUser.get(r.userId)!.lastUsedAt,
					}
				: null,
		})),
		grants: grants.map((g) => ({
			...g,
			userName: nameByUser.get(g.userId) || g.userId,
		})),
	});
}

export async function POST(req: NextRequest) {
	const auth = await requirePerms(["Admin", "Root"], req);
	if (auth instanceof NextResponse) return auth;

	const body = await req.json().catch(() => null);
	const action = body?.action;

	if (action === "approve") {
		const requestId = String(body?.requestId ?? "");
		if (!mongoose.isValidObjectId(requestId)) {
			return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
		}
		const accessRequest = await ApiAccessRequest.findById(requestId);
		if (!accessRequest) {
			return NextResponse.json({ error: "Request not found" }, { status: 404 });
		}
		if (accessRequest.status !== "pending") {
			return NextResponse.json({ error: "Request is not pending" }, { status: 409 });
		}

		accessRequest.status = "approved";
		accessRequest.reviewedBy = auth.userId;
		accessRequest.reviewedAt = new Date();
		accessRequest.reviewNote = typeof body?.reviewNote === "string" ? body.reviewNote : null;
		await accessRequest.save();

		const createdGrants = [];
		for (const book of accessRequest.books) {
			const existing = await ApiBookGrant.findOne({
				userId: accessRequest.userId,
				book,
				revokedAt: null,
			});
			if (existing) {
				createdGrants.push(existing);
				continue;
			}
			createdGrants.push(
				await ApiBookGrant.create({
					userId: accessRequest.userId,
					book,
					requestId: String(accessRequest._id),
					grantedBy: auth.userId,
				})
			);
		}

		return NextResponse.json({ request: accessRequest, grants: createdGrants });
	}

	if (action === "reject") {
		const requestId = String(body?.requestId ?? "");
		if (!mongoose.isValidObjectId(requestId)) {
			return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
		}
		const accessRequest = await ApiAccessRequest.findById(requestId);
		if (!accessRequest) {
			return NextResponse.json({ error: "Request not found" }, { status: 404 });
		}
		if (accessRequest.status !== "pending") {
			return NextResponse.json({ error: "Request is not pending" }, { status: 409 });
		}

		accessRequest.status = "rejected";
		accessRequest.reviewedBy = auth.userId;
		accessRequest.reviewedAt = new Date();
		accessRequest.reviewNote = typeof body?.reviewNote === "string" ? body.reviewNote : null;
		await accessRequest.save();
		return NextResponse.json({ request: accessRequest });
	}

	if (action === "revokeGrant") {
		const grantId = String(body?.grantId ?? "");
		if (!mongoose.isValidObjectId(grantId)) {
			return NextResponse.json({ error: "Invalid grant id" }, { status: 400 });
		}
		const grant = await ApiBookGrant.findByIdAndUpdate(
			grantId,
			{ $set: { revokedAt: new Date() } },
			{ new: true }
		);
		if (!grant) {
			return NextResponse.json({ error: "Grant not found" }, { status: 404 });
		}
		return NextResponse.json({ grant });
	}

	if (action === "revokeKey") {
		const userId = String(body?.userId ?? "");
		if (!userId) {
			return NextResponse.json({ error: "userId is required" }, { status: 400 });
		}
		const result = await ApiKey.updateMany(
			{ userId, status: "active" },
			{ $set: { status: "revoked", revokedAt: new Date() } }
		);
		return NextResponse.json({ success: true, revokedCount: result.modifiedCount });
	}

	return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
