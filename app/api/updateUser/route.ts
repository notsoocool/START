import { NextResponse, NextRequest } from "next/server";
import Perms from "@/lib/db/permissionsModel";
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";
import { logUsageHistory } from "@/lib/utils/usageHistoryLogger";

export async function POST(req: NextRequest) {
	const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

	try {
		const { userId, newPermission } = await req.json();
		const oldUser = await Perms.findOne({ userID: userId });

		const user = await Perms.findOneAndUpdate(
			{ userID: userId },
			{ perms: newPermission },
			{ new: true }
		);

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		if (oldUser && oldUser.perms !== newPermission) {
			await logUsageHistory("permission_change", {
				userId,
				userName: user.name,
				oldPermission: oldUser.perms,
				newPermission,
			});
		}

		return NextResponse.json({ success: true, user });
  } catch (error) {
    // Handle any errors during the update process
    return NextResponse.json(
      { error: "Failed to update permission" },
      { status: 500 }
    );
  }
}
