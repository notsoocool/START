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
		changes?: {
			field: string;
			oldValue: any;
			newValue: any;
		}[];
	};
}

export async function logHistory(params: LogHistoryParams) {
	try {
		await dbConnect();
		const user = await currentUser();

		if (!user) {
			console.error("No user found for history logging");
			return;
		}

		await History.create({
			...params,
			userId: user.id,
			userName: user.firstName ? `${user.firstName} ${user.lastName || ""}` : user.username || "Unknown User",
			timestamp: new Date(),
		});
	} catch (error) {
		console.error("Error logging history:", error);
	}
}
