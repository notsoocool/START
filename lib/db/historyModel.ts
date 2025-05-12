import mongoose, { Schema, Document } from "mongoose";

export interface History extends Document {
	action: "delete" | "edit" | "create" | "publish" | "unpublish" | "lock" | "unlock" | "complete_delete";
	modelType: "Shloka" | "Analysis";
	userId: string;
	userName: string;
	timestamp: Date;
	details: {
		book: string;
		part1?: string;
		part2?: string;
		chaptno: string;
		slokano: string;
		isCompleteDeletion?: boolean;
		changes?: {
			field: string;
			oldValue: any;
			newValue: any;
		}[];
	};
}

const HistorySchema: Schema = new Schema(
	{
		action: {
			type: String,
			required: true,
			enum: ["delete", "edit", "create", "publish", "unpublish", "lock", "unlock", "complete_delete"],
		},
		modelType: {
			type: String,
			required: true,
			enum: ["Shloka", "Analysis"],
		},
		userId: {
			type: String,
			required: true,
		},
		userName: {
			type: String,
			required: true,
		},
		timestamp: {
			type: Date,
			default: Date.now,
		},
		details: {
			book: { type: String, required: true },
			part1: { type: String },
			part2: { type: String },
			chaptno: { type: String, required: true },
			slokano: { type: String, required: true },
			isCompleteDeletion: { type: Boolean },
			changes: [
				{
					field: { type: String },
					oldValue: { type: Schema.Types.Mixed },
					newValue: { type: Schema.Types.Mixed },
				},
			],
		},
	},
	{
		timestamps: true,
	}
);

export default mongoose.models.History || mongoose.model<History>("History", HistorySchema);
