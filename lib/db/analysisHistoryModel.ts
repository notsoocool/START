import mongoose, { Schema, Document } from "mongoose";

export interface AnalysisHistory extends Document {
	action: "edit" | "add" | "delete";
	userId: string;
	userName: string;
	timestamp: Date;
	location: {
		book: string;
		part1?: string;
		part2?: string;
		chaptno: string;
		slokano: string;
	};
	/** Full row data (current state for edit/add, deleted state for delete) */
	row: Record<string, unknown>;
	/** For edit: previous full row for diff */
	oldRow?: Record<string, unknown>;
	/** For edit: field names that changed (for highlighting) */
	changedFields?: string[];
}

const AnalysisHistorySchema: Schema = new Schema(
	{
		action: { type: String, required: true, enum: ["edit", "add", "delete"] },
		userId: { type: String, required: true },
		userName: { type: String, required: true },
		timestamp: { type: Date, default: Date.now },
		location: {
			book: { type: String, required: true },
			part1: { type: String },
			part2: { type: String },
			chaptno: { type: String, required: true },
			slokano: { type: String, required: true },
		},
		row: { type: Schema.Types.Mixed, required: true },
		oldRow: { type: Schema.Types.Mixed },
		changedFields: [{ type: String }],
	},
	{ timestamps: true }
);

export default mongoose.models.AnalysisHistory || mongoose.model<AnalysisHistory>("AnalysisHistory", AnalysisHistorySchema);
