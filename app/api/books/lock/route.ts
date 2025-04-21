import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import AHShloka from "@/lib/db/newShlokaModel";
import { currentUser } from "@clerk/nextjs/server";
import Perms from "@/lib/db/permissionsModel";

// Helper function to handle CORS
const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "PATCH, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
	return NextResponse.json({}, { headers: corsHeaders });
}

export async function PATCH(request: NextRequest) {
	await dbConnect();

	try {
		// Get current user from Clerk
		const user = await currentUser();
		if (!user) {
			return NextResponse.json({ error: "User not authenticated" }, { status: 401, headers: { ...corsHeaders } });
		}

		// Get user permissions
		const userPermissions = await Perms.findOne({ userID: user.id });
		if (!userPermissions) {
			return NextResponse.json({ error: "User permissions not found" }, { status: 404, headers: { ...corsHeaders } });
		}

		// Only Admin and Root users can update lock status
		if (userPermissions.perms !== "Admin" && userPermissions.perms !== "Root") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403, headers: { ...corsHeaders } });
		}

		const { book, locked } = await request.json();

		if (!book) {
			return NextResponse.json({ error: "Book name is required" }, { status: 400, headers: { ...corsHeaders } });
		}

		// Update all shlokas in the book with the new lock status
		const result = await AHShloka.updateMany({ book }, { $set: { locked } });

		return NextResponse.json(
			{
				success: true,
				message: `Updated lock status for ${result.modifiedCount} shlokas in ${book}`,
				modifiedCount: result.modifiedCount,
			},
			{ headers: { ...corsHeaders } }
		);
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				message: "Error updating lock status",
				error: (error as Error).message,
			},
			{ status: 500, headers: { ...corsHeaders } }
		);
	}
}
