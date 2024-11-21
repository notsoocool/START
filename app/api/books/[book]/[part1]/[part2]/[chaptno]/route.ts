// /app/api/books/[book]/[part1]/[part2]/[chaptno]/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AHShloka from "@/lib/db/newShlokaModel";

interface Params {
    book: string;
    part1: string;
    part2: string;
    chaptno: string;
}

export async function GET(request: Request, { params }: { params: Params }) {
    await dbConnect();
    const { book, part1, part2, chaptno } = params;

    // Query to match the specified book, part1, part2, and chapter
    const query = {
        ...(book !== "null" && { book }),
        ...(part1 !== "null" && { part1 }),
        ...(part2 !== "null" && { part2 }),
        chaptno,
    };

    // Fetch all shlokas for the specified chapter and sort by slokano (numeric order)
    const shlokas = await AHShloka.find(query).sort({
        slokano: 1, // Sort by slokano in ascending order
    });

    return NextResponse.json({ shlokas });
}
