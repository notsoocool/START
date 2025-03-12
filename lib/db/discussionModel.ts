import mongoose, { Schema, Document } from "mongoose";

export interface Discussion extends Document {
	shlokaId: mongoose.Types.ObjectId; // Reference to Shloka model
	userId: string;
	userName: string;
	content: string;
	parentId?: string;
	createdAt: Date;
	updatedAt: Date;
}

const DiscussionSchema: Schema = new Schema({
	shlokaId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Shloka",
		required: true,
	},
	userId: {
		type: String,
		required: true,
	},
	userName: {
		type: String,
		required: true,
	},
	content: {
		type: String,
		required: true,
	},
	parentId: {
		type: String,
		default: null,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

export default mongoose.models.Discussion || mongoose.model<Discussion>("Discussion", DiscussionSchema);
