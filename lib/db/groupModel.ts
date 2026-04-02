import mongoose, { Schema, Document } from "mongoose";

export interface Group extends Document {
	name: string;
	type: "A" | "B";
	members: string[]; // Array of userIDs from permissions model
	/** Must match `book` on Shloka/Analysis. Group-only renames: `scripts/renameBookTitlesMigration.ts`; full rename: POST /api/books/replace. */
	assignedBooks: string[];
	supervisedGroups?: string[]; // For Group B (Editors), this will be the Group A (Annotators) they supervise
}

const GroupSchema: Schema = new Schema(
	{
		name: {
			type: String,
			required: true,
			unique: true,
		},
		type: {
			type: String,
			required: true,
			enum: ["A", "B"],
		},
		members: [
			{
				type: String,
				required: true,
				ref: "UserPermissions", // Reference to the permissions model
			},
		],
		assignedBooks: [
			{
				type: String,
				required: true,
			},
		],
		supervisedGroups: [
			{
				type: String,
				required: false,
				ref: "Group", // Reference to Group A (Annotator) groups
			},
		],
	},
	{
		timestamps: true, // Adds createdAt and updatedAt timestamps
	}
);

export default mongoose.models.Group || mongoose.model<Group>("Group", GroupSchema);
