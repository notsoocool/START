import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function verifyDBAccess(request: NextRequest) {
	const apiKey = request.headers.get("DB-Access-Key");

	// Check if the key matches either the public or private key
	if (!apiKey || (apiKey !== process.env.NEXT_PUBLIC_DBI_KEY && apiKey !== process.env.DB_ACCESS_KEY)) {
		console.log("Invalid API key");
		return new NextResponse(JSON.stringify({ error: "Unauthorized - Invalid API key" }), { status: 401, headers: { "Content-Type": "application/json" } });
	}

	return NextResponse.next();
}
