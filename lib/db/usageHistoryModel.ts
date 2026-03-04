import mongoose, { Schema, Document } from "mongoose";

export type UsageAction =
	| "permission_change"
	| "group_create"
	| "group_update"
	| "group_delete"
	| "member_add"
	| "member_remove"
	| "shloka_create"
	| "shloka_rename"
	| "shloka_delete"
	| "shloka_bulk_delete"
	| "analysis_bulk_delete"
	| "publish"
	| "unpublish"
	| "lock"
	| "unlock";

export interface UsageHistory extends Document {
	action: UsageAction;
	userId: string;
	userName: string;
	timestamp: Date;
	details: Record<string, unknown>;
}

const UsageHistorySchema: Schema = new Schema(
	{
		action: {
			type: String,
			required: true,
			enum: [
				"permission_change",
				"group_create",
				"group_update",
				"group_delete",
				"member_add",
				"member_remove",
				"shloka_create",
				"shloka_rename",
				"shloka_delete",
				"shloka_bulk_delete",
				"analysis_bulk_delete",
				"publish",
				"unpublish",
				"lock",
				"unlock",
			],
		},
		userId: { type: String, required: true },
		userName: { type: String, required: true },
		timestamp: { type: Date, default: Date.now },
		details: { type: Schema.Types.Mixed, default: {} },
	},
	{ timestamps: true }
);

export default mongoose.models.UsageHistory || mongoose.model<UsageHistory>("UsageHistory", UsageHistorySchema);
