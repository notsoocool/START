import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Perms from "@/lib/db/permissionsModel";
import { e2eBypassUser, requestHasValidE2EBypass } from "@/lib/auth/e2eBypass";

export async function requirePerms(allowed: string[], req?: Request | NextRequest) {
	await dbConnect();

	if (req && requestHasValidE2EBypass(req)) {
		const bypass = e2eBypassUser();
		if (!allowed.includes(bypass.perms)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
		return { userId: bypass.userId, name: bypass.name, perms: bypass.perms };
	}

	const user = await currentUser();
	if (!user) {
		return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
	}
	const row = await Perms.findOne({ userID: user.id });
	if (!row || !allowed.includes(row.perms)) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
	return {
		userId: user.id,
		name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || row.name,
		perms: row.perms as string,
	};
}
