import { NextRequest, NextResponse } from "next/server";
import { requirePerms } from "@/lib/auth/requirePerms";
import ApiAccessRequest from "@/lib/db/apiAccessRequestModel";
import ApiBookGrant from "@/lib/db/apiBookGrantModel";

export const dynamic = "force-dynamic";

const ALLOWED = ["Developer", "Admin", "Root"];

export async function GET(req: NextRequest) {
	const auth = await requirePerms(ALLOWED, req);
	if (auth instanceof NextResponse) return auth;

	const [requests, grants] = await Promise.all([
		ApiAccessRequest.find({ userId: auth.userId }).sort({ createdAt: -1 }).lean(),
		ApiBookGrant.find({ userId: auth.userId, revokedAt: null }).sort({ grantedAt: -1 }).lean(),
	]);

	return NextResponse.json({ requests, grants });
}

export async function POST(req: NextRequest) {
	const auth = await requirePerms(ALLOWED, req);
	if (auth instanceof NextResponse) return auth;

	const body = await req.json().catch(() => null);
	const books = Array.isArray(body?.books)
		? body.books.map((b: unknown) => String(b ?? "").trim()).filter(Boolean)
		: [];
	const note = typeof body?.note === "string" ? body.note.trim() : "";

	if (books.length < 1) {
		return NextResponse.json({ error: "Select at least one book" }, { status: 400 });
	}

	const created = await ApiAccessRequest.create({
		userId: auth.userId,
		userName: auth.name,
		books: Array.from(new Set(books)),
		note,
		status: "pending",
	});

	return NextResponse.json(created);
}
