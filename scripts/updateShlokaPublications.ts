import { connect } from "mongoose";
import Shloka from "@/lib/db/newShlokaModel";

async function updateShlokaPublications() {
	try {
		await connect(process.env.MONGO_URI!);
		console.log("Connected to database");

		// Update all existing shlokas to mark them as published and set locked to false
		const result = await Shloka.updateMany(
			{},
			{
				$set: {
					locked: false,
				},
			}
		);

		console.log(`Updated ${result.modifiedCount} shlokas`);
		process.exit(0);
	} catch (error) {
		console.error("Error updating shloka publications:", error);
		process.exit(1);
	}
}

updateShlokaPublications();
