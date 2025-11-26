import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AHShloka from "@/lib/db/newShlokaModel";
import Perms from "@/lib/db/permissionsModel";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(
	request: NextRequest,
	{ params }: { params: { userId: string } }
) {
	try {
		await dbConnect();
		const user = await currentUser();

		if (!user) {
			return NextResponse.json(
				{ error: "User not authenticated" },
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

		const { userId } = params;

		// Get owner information
		const ownerPermissions = await Perms.findOne({ userID: userId });
		if (!ownerPermissions) {
			return NextResponse.json(
				{ error: "Owner not found" },
				{ status: 404 }
			);
		}

		// Get all shlokas owned by this user
		const shlokas = await AHShloka.find({ owner: userId })
			.sort({ book: 1, chaptno: 1, slokano: 1 })
			.select("book part1 part2 chaptno slokano spart createdAt updatedAt");

		// Group shlokas by book
		const booksMap = new Map();
		shlokas.forEach((shloka) => {
			const bookKey = shloka.book;
			if (!booksMap.has(bookKey)) {
				booksMap.set(bookKey, {
					book: shloka.book,
					part1: shloka.part1,
					part2: shloka.part2,
					shlokas: [],
				});
			}
			booksMap.get(bookKey).shlokas.push({
				chaptno: shloka.chaptno,
				slokano: shloka.slokano,
				spart: shloka.spart,
				createdAt: shloka.createdAt,
				updatedAt: shloka.updatedAt,
			});
		});

		return NextResponse.json({
			owner: {
				id: ownerPermissions.userID,
				name: ownerPermissions.name,
				perms: ownerPermissions.perms,
			},
			books: Array.from(booksMap.values()),
			totalShlokas: shlokas.length,
		});
	} catch (error) {
		console.error("Error fetching owner shlokas:", error);
		return NextResponse.json(
			{ error: "Failed to fetch owner shlokas" },
			{ status: 500 }
		);
	}
}

