import mongoose from "mongoose";
import AHShloka from "@/lib/db/newShlokaModel";
import dbConnect from "@/lib/db/connect";

async function updateShlokaOwners() {
	try {
		await dbConnect();
		console.log("Connected to database");

		// Update all shlokas that don't have an owner
		const result = await AHShloka.updateMany({ owner: { $exists: false } }, { $set: { owner: "none" } });

		console.log(`Updated ${result.modifiedCount} shlokas with default owner value`);
	} catch (error) {
		console.error("Error updating shloka owners:", error);
	} finally {
		await mongoose.connection.close();
	}
}

// Run the update
updateShlokaOwners();
