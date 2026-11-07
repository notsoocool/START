// lib/db/permissionsModel.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStart extends Document {
	userID: string;
	name: string;
	email?: string | null;
	perms: string;
}

const startSchema: Schema = new mongoose.Schema({
	userID: {
		type: String,
		required: true,
	},
	name: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: false,
		default: null,
		index: true,
	},
	perms: {
		type: String,
		default: "User",
	},
});

// Check if the model already exists to avoid overwriting
const Perms: Model<IStart> =
	mongoose.models.UserPermissions ||
	mongoose.model<IStart>("UserPermissions", startSchema);

export default Perms;
