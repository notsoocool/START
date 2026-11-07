import { currentUser } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import Perms from "@/lib/db/permissionsModel";
import Group from "@/lib/db/groupModel";
import { requestHasValidE2EBypass } from "@/lib/auth/e2eBypass";

/**
 * Root and Admin may always combine, undo, or split. An Editor may do so only
 * if they belong to a group that has this book assigned. Annotators cannot.
 */
export async function authorizeClusterEdit(
	book: string,
	req?: Request | NextRequest
): Promise<"unauthenticated" | "forbidden" | "ok"> {
	if (req && requestHasValidE2EBypass(req)) {
		return "ok";
	}

	const user = await currentUser();
	if (!user) return "unauthenticated";

	const userPerms = await Perms.findOne({ userID: user.id });
	const role = userPerms?.perms;

	if (role === "Root" || role === "Admin") return "ok";

	if (role === "Editor") {
		const group = await Group.findOne({ members: user.id, assignedBooks: book });
		if (group) return "ok";
	}

	return "forbidden";
}
