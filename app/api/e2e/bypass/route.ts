import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Perms from "@/lib/db/permissionsModel";
import {
	E2E_BYPASS_COOKIE,
	E2E_BYPASS_USER_ID,
	e2eBypassSecret,
	e2eBypassUser,
	isE2EBypassAllowedByEnv,
	secretsMatch,
} from "@/lib/auth/e2eBypass";

export const dynamic = "force-dynamic";

/**
 * LOCAL ONLY. Sets an httpOnly cookie so the Cursor browser can use Root UI
 * without Clerk. Refuses unless ALLOW_E2E_BYPASS=1 and env gates pass.
 *
 * Enable: GET /api/e2e/bypass?secret=...
 * Disable: DELETE /api/e2e/bypass
 */
export async function GET(req: NextRequest) {
	if (!isE2EBypassAllowedByEnv()) {
		return NextResponse.json(
			{ error: "E2E bypass is disabled in this environment" },
			{ status: 404 }
		);
	}

	const secret = e2eBypassSecret();
	const provided =
		req.nextUrl.searchParams.get("secret")?.trim() ||
		req.headers.get("x-e2e-bypass")?.trim() ||
		"";
	if (!secret || !provided || !secretsMatch(provided, secret)) {
		return NextResponse.json({ error: "Invalid bypass secret" }, { status: 401 });
	}

	await dbConnect();
	const user = e2eBypassUser();
	await Perms.findOneAndUpdate(
		{ userID: E2E_BYPASS_USER_ID },
		{ userID: E2E_BYPASS_USER_ID, name: user.name, perms: "Root" },
		{ upsert: true, new: true }
	);

	const res = NextResponse.json({
		ok: true,
		warning: "LOCAL E2E BYPASS ACTIVE — do not use on real workflows",
		user,
	});
	res.cookies.set(E2E_BYPASS_COOKIE, secret, {
		httpOnly: true,
		sameSite: "lax",
		secure: false,
		path: "/",
		maxAge: 60 * 60 * 4, // 4 hours
	});
	return res;
}

export async function DELETE() {
	if (!isE2EBypassAllowedByEnv()) {
		return NextResponse.json({ error: "E2E bypass is disabled" }, { status: 404 });
	}
	const res = NextResponse.json({ ok: true, cleared: true });
	res.cookies.set(E2E_BYPASS_COOKIE, "", {
		httpOnly: true,
		sameSite: "lax",
		secure: false,
		path: "/",
		maxAge: 0,
	});
	return res;
}
