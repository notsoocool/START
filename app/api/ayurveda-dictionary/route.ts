import { NextRequest, NextResponse } from "next/server";
import { lookupAyurvedaMeaning } from "@/lib/ayurvedaDictionary";

const ASHTANGA_BOOK_KEY = "अष्टाङ्गहृदयम्";

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const word = searchParams.get("word")?.trim();
	const book = searchParams.get("book")?.trim();

	if (!word) {
		return NextResponse.json(
			{ error: "Missing 'word' query parameter" },
			{ status: 400 }
		);
	}

	// Only enable this dictionary for Ashtanga Hridayam
	if (book !== ASHTANGA_BOOK_KEY) {
		return NextResponse.json({ found: false }, { status: 200 });
	}

	const definition = lookupAyurvedaMeaning(word);

	if (!definition) {
		return NextResponse.json({ found: false }, { status: 200 });
	}

	return NextResponse.json({
		found: true,
		term: word,
		definition,
	});
}

