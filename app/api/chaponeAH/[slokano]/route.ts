import { NextResponse } from "next/server";
import ChaponeAH from "@/lib/db/chaponeAHModel"; // Adjust the import based on your model's location

// GET request for fetching the chapter by slokano
export async function GET(request: Request, { params }: { params: { slokano: string } }) {
    try {
        const { slokano } = params;

        // Fetch the corresponding ChaponeAH document using the slokano
        const chapter = await ChaponeAH.findOne({ id: slokano });

        if (!chapter) {
            return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
        }

        // Return the full chapter document, including the data array
        return NextResponse.json(chapter);
    } catch (error) {
        console.error("Error fetching ChaponeAH:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH request for updating fields in the chapter by slokano
export async function PATCH(request: Request, { params }: { params: { slokano: string } }) {
    try {
        const { slokano } = params;

        // Parse the JSON body from the request
        const { index, ...updatedFields } = await request.json(); // Spread operator to capture all fields

        // Validate input
        if (typeof index === 'undefined' || !Number.isInteger(index)) {
            return NextResponse.json({ error: "Index is required and must be an integer" }, { status: 400 });
        }

        // Create an update object to only set fields that are defined
        const updateObject: { [key: string]: any } = {};

        // Loop through updatedFields to construct the update object
        for (const [key, value] of Object.entries(updatedFields)) {
            // Add only valid fields to the update object
            if (typeof value !== 'undefined') {
                updateObject[`data.${index}.${key}`] = value;
            }
        }

        // Check if there are any fields to update
        if (Object.keys(updateObject).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        // Update the specific fields in the ChaponeAH document
        const updatedChapter = await ChaponeAH.findOneAndUpdate(
            { id: slokano }, // Match the chapter by slokano
            { $set: updateObject }, // Update the specified fields
            { new: true } // Return the updated document
        );

        // Handle the case where the chapter is not found or the update fails
        if (!updatedChapter) {
            return NextResponse.json({ error: "Chapter not found or update failed" }, { status: 404 });
        }

        // Return the updated chapter document
        return NextResponse.json(updatedChapter);
    } catch (error) {
        console.error("Error updating ChaponeAH:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
