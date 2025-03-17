import { NextResponse, NextRequest } from "next/server";
import Perms from "@/lib/db/permissionsModel"; // Adjust the path as needed
import { verifyDBAccess } from "@/middleware/dbAccessMiddleware";

export async function POST(req: NextRequest) {
    const authResponse = await verifyDBAccess(req);
	if (authResponse instanceof NextResponse && authResponse.status === 401) {
		return authResponse;
	}

  try {
    // Parse the incoming request JSON
    const { userId, newPermission } = await req.json();

    // Find and update the user's permissions
    const user = await Perms.findOneAndUpdate(
      { userID: userId },
      { perms: newPermission },
      { new: true }
    );

    // Check if the user was found and updated
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Return the updated user information
    return NextResponse.json({ success: true, user });
  } catch (error) {
    // Handle any errors during the update process
    return NextResponse.json(
      { error: "Failed to update permission" },
      { status: 500 }
    );
  }
}
