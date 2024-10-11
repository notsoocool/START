// api/updateUserPermission/route.ts
import { NextResponse } from "next/server";
import Perms from "@/lib/db/permissionsModel"; // Adjust the path as needed

export async function POST(req: { json: () => PromiseLike<{ userId: any; newPermission: any; }> | { userId: any; newPermission: any; }; }) {
	const { userId, newPermission } = await req.json();

	try {
		const user = await Perms.findOneAndUpdate(
			{ userID: userId },
			{ perms: newPermission },
			{ new: true }
		);

		if (!user) {
			return NextResponse.json(
				{ error: "User not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({ success: true, user });
	} catch (error) {
		return NextResponse.json(
			{ error: "Failed to update permission" },
			{ status: 500 }
		);
	}
}
