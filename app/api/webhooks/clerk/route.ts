import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Start from "@/lib/db/permissionsModel";

export async function POST(req: Request) {
	// Get the headers
	const headerPayload = headers();
	const svix_id = headerPayload.get("svix-id");
	const svix_timestamp = headerPayload.get("svix-timestamp");
	const svix_signature = headerPayload.get("svix-signature");

	// If there are no headers, error out
	if (!svix_id || !svix_timestamp || !svix_signature) {
		return new Response("Error occurred -- no svix headers", {
			status: 400,
		});
	}

	// Get the body
	const payload = await req.json();
	const body = JSON.stringify(payload);

	// Create a new Svix instance with your webhook secret
	const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

	let evt: WebhookEvent;

	// Verify the payload
	try {
		evt = wh.verify(body, {
			"svix-id": svix_id,
			"svix-timestamp": svix_timestamp,
			"svix-signature": svix_signature,
		}) as WebhookEvent;
	} catch (err) {
		console.error("Error verifying webhook:", err);
		return new Response("Error occurred", {
			status: 400,
		});
	}

	// Handle the webhook
	const eventType = evt.type;

	if (eventType === "user.created") {
		try {
			console.log("=== WEBHOOK DEBUG START ===");
			console.log("Processing user.created webhook for user:", evt.data.id);
			console.log("Full webhook data:", JSON.stringify(evt.data, null, 2));

			await dbConnect();
			console.log("Database connected successfully");

			// Extract user data from the webhook payload
			const userData = evt.data;
			const firstName = userData.first_name || "";
			const lastName = userData.last_name || "";
			const fullName = `${firstName} ${lastName}`.trim() || "Unknown User";

			console.log("Creating user with data:", {
				userID: userData.id,
				name: fullName,
				perms: "User",
			});

			// Check if user already exists
			const existingUser = await Start.findOne({ userID: userData.id });
			if (existingUser) {
				console.log("User already exists in database:", existingUser);
				return NextResponse.json({ success: true, user: existingUser, message: "User already exists" });
			}

			// Create a new user in our permissions model
			const newUser = await Start.create({
				userID: userData.id,
				name: fullName,
				perms: "User", // Default permission
			});

			console.log("User created successfully in database:", newUser);
			console.log("=== WEBHOOK DEBUG END ===");
			return NextResponse.json({ success: true, user: newUser });
		} catch (error) {
			console.error("=== WEBHOOK ERROR ===");
			console.error("Error creating user in permissions model:", error);
			console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
			console.error("=== WEBHOOK ERROR END ===");
			return NextResponse.json(
				{
					error: "Failed to create user",
					details: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 500 }
			);
		}
	}

	return NextResponse.json({ success: true });
}
