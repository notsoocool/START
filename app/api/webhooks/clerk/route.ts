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
		return new Response("Error occured -- no svix headers", {
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
		return new Response("Error occured", {
			status: 400,
		});
	}

	// Handle the webhook
	const eventType = evt.type;

	if (eventType === "user.created") {
		try {
			await dbConnect();

			// Create a new user in our permissions model
			await Start.create({
				userID: evt.data.id,
				name: `${evt.data.first_name} ${evt.data.last_name}`,
				perms: "User", // Default permission
			});

			return NextResponse.json({ success: true });
		} catch (error) {
			console.error("Error creating user in permissions model:", error);
			return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
		}
	}

	return NextResponse.json({ success: true });
}
