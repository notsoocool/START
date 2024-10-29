import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AHShloka from "@/lib/db/newShlokaModel"; // Adjust the path as needed

export async function GET() {
    await dbConnect();

    // Fetch distinct book names from the database
    const books = await AHShloka.distinct("book");

    // Prepare a structure to hold the tree data
    const tree: Array<{ book: string; part1: Array<{ part: string; part2: Array<{ part: string; chapters: string[] }> }> }> = [];

    for (const book of books) {
        // For each book, fetch distinct part1 values
        const part1Values = await AHShloka.distinct("part1", { book });

        const part1Tree = [];

        for (const part1 of part1Values) {
            // For each part1, fetch distinct part2 values
            const part2Values = await AHShloka.distinct("part2", { book, part1 });

            const part2Tree = [];

            for (const part2 of part2Values) {
                // For each part2, fetch chapters (chaptno)
                const chapters = await AHShloka.find({ book, part1, part2 }).distinct("chaptno");

                part2Tree.push({
                    part: part2,
                    chapters: chapters,
                });
            }

            part1Tree.push({
                part: part1,
                part2: part2Tree,
            });
        }

        tree.push({
            book,
            part1: part1Tree,
        });
    }

    return NextResponse.json(tree);
}
