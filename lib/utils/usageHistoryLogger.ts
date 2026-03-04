import dbConnect from "@/lib/db/connect";
import UsageHistory from "@/lib/db/usageHistoryModel";
import { currentUser } from "@clerk/nextjs/server";
import type { UsageAction } from "@/lib/db/usageHistoryModel";

export async function logUsageHistory(action: UsageAction, details: Record<string, unknown>) {
	try {
		await dbConnect();
		const user = await currentUser();
		if (!user) return null;

		const userName = user.firstName ? `${user.firstName} ${user.lastName || ""}` : user.username || "Unknown User";

		await UsageHistory.create({
			action,
			userId: user.id,
			userName,
			details,
		});
	} catch (e) {
		console.error("Error logging usage history:", e);
	}
}
