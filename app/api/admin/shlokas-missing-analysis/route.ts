import { NextRequest, NextResponse } from "next/server";
import type { PipelineStage } from "mongoose";
import dbConnect from "@/lib/db/connect";
import AHShloka from "@/lib/db/newShlokaModel";
import { currentUser } from "@clerk/nextjs/server";
import Perms from "@/lib/db/permissionsModel";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	try {
		await dbConnect();
		const user = await currentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const perms = await Perms.findOne({ userID: user.id });
		if (!perms || (perms.perms !== "Admin" && perms.perms !== "Root")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const book = searchParams.get("book");
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "50");
		const skip = (page - 1) * limit;

		// Build match for shlokas
		const shlokaMatch: Record<string, unknown> = {};
		if (book) shlokaMatch.book = book;

		// Get all shlokas, then find those without analysis
		// Use aggregation: left join with analysis, filter where analysis is null
		// Normalize null/undefined for part1/part2 comparison
		const pipeline: PipelineStage[] = [
			{ $match: shlokaMatch },
			{
				$lookup: {
					from: "analyses",
					let: {
						s_book: "$book",
						s_part1: { $ifNull: ["$part1", "__NULL__"] },
						s_part2: { $ifNull: ["$part2", "__NULL__"] },
						s_chaptno: "$chaptno",
						s_slokano: "$slokano",
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ["$book", "$$s_book"] },
										{ $eq: [{ $ifNull: ["$part1", "__NULL__"] }, "$$s_part1"] },
										{ $eq: [{ $ifNull: ["$part2", "__NULL__"] }, "$$s_part2"] },
										{ $eq: ["$chaptno", "$$s_chaptno"] },
										{ $eq: ["$slokano", "$$s_slokano"] },
									],
								},
							},
						},
						{ $limit: 1 },
					],
					as: "analysis",
				},
			},
			{ $match: { analysis: { $size: 0 } } },
			{ $sort: { book: 1, part1: 1, part2: 1, chaptno: 1, slokano: 1 } },
			{
				$facet: {
					shlokas: [{ $skip: skip }, { $limit: limit }, { $project: { analysis: 0 } }],
					total: [{ $count: "count" }],
				},
			},
		];

		const result = await AHShloka.aggregate(pipeline);
		const shlokas = result[0]?.shlokas || [];
		const total = result[0]?.total?.[0]?.count || 0;

		return NextResponse.json({
			shlokas,
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("Error fetching shlokas missing analysis:", error);
		return NextResponse.json(
			{ error: "Failed to fetch shlokas" },
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		await dbConnect();
		const user = await currentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const perms = await Perms.findOne({ userID: user.id });
		if (!perms || (perms.perms !== "Admin" && perms.perms !== "Root")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const book = searchParams.get("book");

		const shlokaMatch: Record<string, unknown> = {};
		if (book) shlokaMatch.book = book;

		const deletePipeline: PipelineStage[] = [
			{ $match: shlokaMatch },
			{
				$lookup: {
					from: "analyses",
					let: {
						s_book: "$book",
						s_part1: { $ifNull: ["$part1", "__NULL__"] },
						s_part2: { $ifNull: ["$part2", "__NULL__"] },
						s_chaptno: "$chaptno",
						s_slokano: "$slokano",
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ["$book", "$$s_book"] },
										{ $eq: [{ $ifNull: ["$part1", "__NULL__"] }, "$$s_part1"] },
										{ $eq: [{ $ifNull: ["$part2", "__NULL__"] }, "$$s_part2"] },
										{ $eq: ["$chaptno", "$$s_chaptno"] },
										{ $eq: ["$slokano", "$$s_slokano"] },
									],
								},
							},
						},
						{ $limit: 1 },
					],
					as: "analysis",
				},
			},
			{ $match: { analysis: { $size: 0 } } },
			{ $project: { _id: 1 } },
		];

		const shlokasToDelete = await AHShloka.aggregate(deletePipeline);
		const ids = shlokasToDelete.map((s: { _id: unknown }) => s._id);

		if (ids.length === 0) {
			return NextResponse.json({
				message: "No shlokas missing analysis to delete",
				deletedCount: 0,
			});
		}

		const result = await AHShloka.deleteMany({ _id: { $in: ids } });

		return NextResponse.json({
			message: `Deleted ${result.deletedCount} shloka(s) missing analysis`,
			deletedCount: result.deletedCount,
		});
	} catch (error) {
		console.error("Error deleting shlokas missing analysis:", error);
		return NextResponse.json(
			{ error: "Failed to delete shlokas" },
			{ status: 500 }
		);
	}
}
