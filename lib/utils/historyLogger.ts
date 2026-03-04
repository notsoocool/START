import dbConnect from "@/lib/db/connect";
import History from "@/lib/db/historyModel";
import { currentUser } from "@clerk/nextjs/server";

interface LogHistoryParams {
	action: "delete" | "edit" | "create" | "publish" | "unpublish" | "lock" | "unlock" | "complete_delete";
	modelType: "Shloka" | "Analysis";
	details: {
		book: string;
		part1?: string;
		part2?: string;
		chaptno: string;
		slokano: string;
		isCompleteDeletion?: boolean;
		userId?: string;
		changes?: {
			field: string;
			oldValue: any;
			newValue: any;
		}[];
	};
}

const MERGE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes - merge rapid edits into one entry

export async function logHistory(params: LogHistoryParams) {
	try {
		await dbConnect();
		const user = await currentUser();

		if (!user) {
			console.error("No user found for history logging");
			return null;
		}

		const userName = user.firstName ? `${user.firstName} ${user.lastName || ""}` : user.username || "Unknown User";
		const now = new Date();

		// For Analysis edits: try to merge into recent entry (same user, same location, within 2 min)
		if (
			params.action === "edit" &&
			params.modelType === "Analysis" &&
			params.details.changes &&
			params.details.changes.length > 0
		) {
			const cutoff = new Date(now.getTime() - MERGE_WINDOW_MS);
			const lastEntry = await History.findOne({
				userId: user.id,
				modelType: "Analysis",
				action: "edit",
				"details.book": params.details.book,
				"details.chaptno": params.details.chaptno,
				"details.slokano": params.details.slokano,
				timestamp: { $gte: cutoff },
			})
				.sort({ timestamp: -1 })
				.lean();

			if (lastEntry && !Array.isArray(lastEntry)) {
				const entry = lastEntry as { _id: unknown; details?: { part1?: string; part2?: string; changes?: typeof params.details.changes } };
				const part1Match =
					(String(entry.details?.part1 ?? "") === "" && String(params.details.part1 ?? "") === "") ||
					entry.details?.part1 === params.details.part1;
				const part2Match =
					(String(entry.details?.part2 ?? "") === "" && String(params.details.part2 ?? "") === "") ||
					entry.details?.part2 === params.details.part2;

				if (part1Match && part2Match) {
					const existingChanges = entry.details?.changes || [];
					const mergedChanges = [...existingChanges, ...params.details.changes];
					await History.findByIdAndUpdate(entry._id, {
						$set: {
							"details.changes": mergedChanges,
							timestamp: now,
						},
					});
					return entry;
				}
			}
		}

		const historyEntry = await History.create({
			...params,
			userId: user.id,
			userName,
			timestamp: now,
		});

		return historyEntry;
	} catch (error) {
		console.error("Error logging history:", error);
		return null;
	}
}
