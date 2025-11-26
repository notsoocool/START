import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db/connect";
import Perms from "@/lib/db/permissionsModel";
import Analysis from "@/lib/db/newAnalysisModel";

// Store languages in memory (in production, you might want to use a database)
// Default languages

let languages: { code: string; name: string }[] = [];

// Common language code to name mapping
const LANGUAGE_NAMES: { [key: string]: string } = {
	ta: "Tamil",
	hi: "Hindi",
	en: "English",
	sa: "Sanskrit",
	sn: "Sanskrit", // Alternative code for Sanskrit
	kn: "Kannada",
	te: "Telugu",
	ml: "Malayalam",
	gu: "Gujarati",
	pa: "Punjabi",
	bn: "Bengali",
	mr: "Marathi",
	or: "Odia",
	as: "Assamese",
	ne: "Nepali",
	ur: "Urdu",
	fr: "French",
	de: "German",
	es: "Spanish",
	it: "Italian",
	pt: "Portuguese",
	ru: "Russian",
	ja: "Japanese",
	zh: "Chinese",
	ar: "Arabic",
};

export async function GET() {
	try {
		await dbConnect();
		const user = await currentUser();

		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		// Discover languages from the database by checking meanings field
		const discoveredCodes = new Set<string>();

		try {
			// Use aggregation to extract all unique language codes from meanings objects
			const languageCodes = await Analysis.aggregate([
				{
					$match: {
						meanings: { $exists: true, $ne: null },
					},
				},
				{
					$project: {
						meaningsKeys: { $objectToArray: "$meanings" },
					},
				},
				{
					$unwind: "$meaningsKeys",
				},
				{
					$group: {
						_id: { $toLower: "$meaningsKeys.k" },
					},
				},
				{
					$match: {
						_id: { $regex: /^[a-z]{2}$/ },
					},
				},
				{
					$project: {
						_id: 0,
						code: "$_id",
					},
				},
			]);

			// Extract unique language codes from aggregation result
			languageCodes.forEach((item) => {
				if (item.code && item.code.length === 2) {
					discoveredCodes.add(item.code.toLowerCase());
				}
			});
		} catch (aggError) {
			// Fallback: query documents directly if aggregation fails
			console.warn(
				"Aggregation failed, using fallback method:",
				aggError
			);
			const analyses = await Analysis.find({
				meanings: { $exists: true, $ne: null },
			})
				.select("meanings")
				.limit(1000);

			analyses.forEach((analysis) => {
				if (analysis.meanings) {
					let meaningsObj: any = {};

					// Handle Map type (from Mongoose)
					if (analysis.meanings instanceof Map) {
						meaningsObj = Object.fromEntries(analysis.meanings);
					}
					// Handle plain object (from MongoDB)
					else if (
						typeof analysis.meanings === "object" &&
						analysis.meanings !== null
					) {
						meaningsObj = analysis.meanings;
					}

					// Extract all keys (language codes) from the meanings object
					Object.keys(meaningsObj).forEach((code) => {
						// Only add valid 2-character language codes
						if (
							code &&
							code.length === 2 &&
							/^[a-z]{2}$/i.test(code)
						) {
							discoveredCodes.add(code.toLowerCase());
						}
					});
				}
			});
		}

		// Merge manually added languages with discovered languages
		const languageMap = new Map<string, string>();

		// First, add manually added languages (they have custom names)
		languages.forEach((lang) => {
			languageMap.set(lang.code.toLowerCase(), lang.name);
		});

		// Then, add discovered languages (use name from mapping or code as fallback)
		discoveredCodes.forEach((code) => {
			if (!languageMap.has(code)) {
				languageMap.set(
					code,
					LANGUAGE_NAMES[code] || code.toUpperCase()
				);
			}
		});

		// Create a set of manually added language codes for reference
		const manuallyAddedCodes = new Set(
			languages.map((lang) => lang.code.toLowerCase())
		);

		// Convert to array and sort, marking which are manually added
		const allLanguages = Array.from(languageMap.entries())
			.map(([code, name]) => ({
				code,
				name,
				isManuallyAdded: manuallyAddedCodes.has(code),
			}))
			.sort((a, b) => a.code.localeCompare(b.code));

		// All authenticated users can read the list of languages
		// (needed for the analysis page to display language columns)
		return NextResponse.json({ languages: allLanguages });
	} catch (error) {
		console.error("Error fetching languages:", error);
		return NextResponse.json(
			{ error: "Failed to fetch languages" },
			{ status: 500 }
		);
	}
}

export async function POST(req: NextRequest) {
	try {
		await dbConnect();
		const user = await currentUser();

		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		// Check if user is Admin or Root
		const userPermissions = await Perms.findOne({ userID: user.id });
		if (!userPermissions) {
			return NextResponse.json(
				{ error: "User permissions not found" },
				{ status: 404 }
			);
		}
		if (
			userPermissions.perms !== "Root" &&
			userPermissions.perms !== "Admin"
		) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const { code, name } = await req.json();

		if (!code || !name) {
			return NextResponse.json(
				{ error: "Language code and name are required" },
				{ status: 400 }
			);
		}

		// Validate ISO 639-1 language code (2 characters)
		if (!/^[a-z]{2}$/i.test(code)) {
			return NextResponse.json(
				{
					error: "Language code must be a valid ISO 639-1 code (2 letters)",
				},
				{ status: 400 }
			);
		}

		const normalizedCode = code.toLowerCase();

		// Check if language already exists
		if (languages.some((lang) => lang.code === normalizedCode)) {
			return NextResponse.json(
				{ error: "Language already exists" },
				{ status: 400 }
			);
		}

		// Add new language
		languages.push({ code: normalizedCode, name });
		languages.sort((a, b) => a.code.localeCompare(b.code));

		return NextResponse.json({
			success: true,
			languages,
			message: `Language ${name} (${normalizedCode}) added successfully`,
		});
	} catch (error) {
		console.error("Error adding language:", error);
		return NextResponse.json(
			{ error: "Failed to add language" },
			{ status: 500 }
		);
	}
}

export async function DELETE(req: NextRequest) {
	try {
		await dbConnect();
		const user = await currentUser();

		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		// Check if user is Root (only Root can delete languages)
		const userPermissions = await Perms.findOne({ userID: user.id });
		if (!userPermissions) {
			return NextResponse.json(
				{ error: "User permissions not found" },
				{ status: 404 }
			);
		}
		if (userPermissions.perms !== "Root") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const { code } = await req.json();

		if (!code) {
			return NextResponse.json(
				{ error: "Language code is required" },
				{ status: 400 }
			);
		}

		const normalizedCode = code.toLowerCase();

		// Check if this is a default/protected language
		const DEFAULT_LANGUAGES = ["en", "hi", "ta"];
		if (DEFAULT_LANGUAGES.includes(normalizedCode)) {
			return NextResponse.json(
				{ error: "Cannot delete default languages (en, hi, ta)" },
				{ status: 400 }
			);
		}

		// Only remove manually added languages (not discovered ones)
		// Discovered languages exist in the database and cannot be deleted via this endpoint
		const index = languages.findIndex(
			(lang) => lang.code === normalizedCode
		);
		if (index === -1) {
			return NextResponse.json(
				{
					error: "Language not found in manually added languages. Discovered languages from the database cannot be deleted. Remove the language data from analysis records first.",
				},
				{ status: 404 }
			);
		}

		const removedLanguage = languages[index];
		languages.splice(index, 1);

		return NextResponse.json({
			success: true,
			languages,
			message: `Language ${removedLanguage.name} (${normalizedCode}) removed successfully`,
		});
	} catch (error) {
		console.error("Error deleting language:", error);
		return NextResponse.json(
			{ error: "Failed to delete language" },
			{ status: 500 }
		);
	}
}
