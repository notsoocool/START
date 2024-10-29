import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Analysis from "@/lib/db/newAnalysisModel";

interface Params {
	book: string;
	part1: string;
	part2: string;
	chaptno: string;
	slokano: string;
}

export async function GET(req: Request, { params }: { params: Params }) {
	const { book, part1, part2, chaptno, slokano } = params;

	await dbConnect(); // Connect to the database

	try {
		// Log the parameters and query
		console.log("Params received:", params);

		const query = {
			book,
			part1: part1 !== "null" ? part1 : null,
			part2: part2 !== "null" ? part2 : null,
			chaptno,
			slokano,
		};

		console.log("Query being used:", query);

		const analysis = await Analysis.find(query);

		if (!analysis) {
			console.log("No matching analysis found");
			return NextResponse.json(
				{ message: "Analysis not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json(analysis);
	} catch (error) {
		console.error("Error fetching analysis:", error);
		return NextResponse.json(
			{ message: "Internal Server Error" },
			{ status: 500 }
		);
	}
}

export async function PATCH(request: Request, { params }: { params: { book: string; part1: string; part2: string; chaptno: string; slokano: string } }) {
    const { book, part1, part2, chaptno, slokano } = params;

    await dbConnect(); // Connect to the database

    try {
        // Log the received parameters
        console.log("Params received:", params);

        // Construct the query, handling null values for optional parts
        const query = {
            book,
            part1: part1 !== "null" ? part1 : null,
            part2: part2 !== "null" ? part2 : null,
            chaptno,
            slokano,
        };

        // Parse and validate the JSON body
        const { index, ...updatedFields } = await request.json();
        if (typeof index === 'undefined' || !Number.isInteger(index)) {
            return NextResponse.json({ error: "Index is required and must be an integer" }, { status: 400 });
        }

        // Build the update object dynamically
        const updateObject: { [key: string]: any } = {};
        for (const [key, value] of Object.entries(updatedFields)) {
            if (typeof value !== 'undefined') {
                updateObject[`${index}.${key}`] = value;
            }
        }

        // If no valid fields are provided, return an error
        if (Object.keys(updateObject).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        // Execute the update in the ChaponeAH model
        const updatedChapter = await Analysis.findOneAndUpdate(
            query,
            { $set: updateObject },
            { new: true }
        );

        // Check if the document was found and updated
        if (!updatedChapter) {
            return NextResponse.json({ error: "Chapter not found or update failed" }, { status: 404 });
        }

        // Return the updated chapter document
        return NextResponse.json(updatedChapter);
    } catch (error) {
        console.error("Error updating Analysis:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

