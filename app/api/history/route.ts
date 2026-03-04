import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AnalysisHistory from "@/lib/db/analysisHistoryModel";
import UsageHistory from "@/lib/db/usageHistoryModel";
import { currentUser } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

type HistoryType = "all" | "analysis" | "usage";

function normalizeAnalysis(doc: Record<string, unknown>) {
	return {
		_id: doc._id,
		type: "analysis" as const,
		action: doc.action,
		userId: doc.userId,
		userName: doc.userName,
		timestamp: doc.timestamp,
		location: doc.location,
		row: doc.row,
		oldRow: doc.oldRow,
		changedFields: doc.changedFields || [],
	};
}

function normalizeUsage(doc: Record<string, unknown>) {
	return {
		_id: doc._id,
		type: "usage" as const,
		action: doc.action,
		userId: doc.userId,
		userName: doc.userName,
		timestamp: doc.timestamp,
		details: doc.details || {},
	};
}

export async function GET(request: NextRequest) {
	await dbConnect();

	try {
		const user = await currentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "20");
		const type = (searchParams.get("type") || "all") as HistoryType;

		const skip = (page - 1) * limit;
		const fetchLimit = Math.max(limit * 20, 1000);

		let merged: Array<Record<string, unknown>> = [];

		if (type === "all" || type === "analysis") {
			const analysisDocs = await AnalysisHistory.find()
				.sort({ timestamp: -1 })
				.limit(type === "analysis" ? skip + limit : fetchLimit)
				.lean();
			merged = [...merged, ...analysisDocs.map((d) => normalizeAnalysis(d as Record<string, unknown>))];
		}

		if (type === "all" || type === "usage") {
			const usageDocs = await UsageHistory.find()
				.sort({ timestamp: -1 })
				.limit(type === "usage" ? skip + limit : fetchLimit)
				.lean();
			merged = [...merged, ...usageDocs.map((d) => normalizeUsage(d as Record<string, unknown>))];
		}

		merged.sort(
			(a, b) =>
				new Date((b.timestamp as string) || 0).getTime() - new Date((a.timestamp as string) || 0).getTime()
		);

		const [totalAnalysis, totalUsage] = await Promise.all([
			type === "usage" ? 0 : AnalysisHistory.countDocuments(),
			type === "analysis" ? 0 : UsageHistory.countDocuments(),
		]);
		const total = type === "all" ? totalAnalysis + totalUsage : type === "analysis" ? totalAnalysis : totalUsage;
		const paginated = merged.slice(skip, skip + limit);

		return NextResponse.json({
			history: paginated,
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit) || 1,
			},
		});
	} catch (error) {
		console.error("Error fetching history:", error);
		return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
	}
}
