import { NextResponse } from "next/server";
import Shloka from "@/lib/db/newShlokaModel";
import Analysis from "@/lib/db/newAnalysisModel";
import dbConnect from "@/lib/db/connect";

export async function POST(req: Request) {
  await dbConnect();

  // Parse the incoming JSON body
  const { book, part1, part2, shlokaData, analysisData } = await req.json();

  // Validate required fields
  if (!book) {
    return NextResponse.json(
      { error: "Book is required to upload" },
      { status: 400 }
    );
  }

  if (!shlokaData || !analysisData) {
    return NextResponse.json(
      { error: "Both shlokaData and analysisData are required" },
      { status: 400 }
    );
  }

  try {
    // Add book, part1, and part2 to each shloka and analysis entry
    const updatedShlokas = shlokaData.map((shloka: any) => ({
      ...shloka,
      book,
      part1: part1 || null,
      part2: part2 || null,
    }));

    const updatedAnalyses = analysisData.map((analysis: any) => ({
      ...analysis,
      book,
      part1: part1 || null,
      part2: part2 || null,
    }));

    // Insert into MongoDB
    await Shloka.insertMany(updatedShlokas);
    await Analysis.insertMany(updatedAnalyses);

    return NextResponse.json({ success: true, message: "Data uploaded successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to upload data" },
      { status: 500 }
    );
  }
}
