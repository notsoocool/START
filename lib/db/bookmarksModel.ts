import mongoose, { Schema, Document } from "mongoose";

export interface IBookmark extends Document {
	userID: string;
	analysisID: string;
	shlokaID: string;
	createdAt: Date;
	notes?: string; // Optional field for users to add notes to their bookmarks
}

const BookmarkSchema: Schema = new Schema(
	{
		userID: {
			type: String,
			required: true,
			ref: "UserPermissions", // Reference to the Perms model
		},
		analysisID: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: "Analysis", // Reference to the Analysis model
		},
		shlokaID: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: "Shloka",
		},
		createdAt: {
			type: Date,
			default: Date.now,
		},
		notes: {
			type: String,
			required: false,
		},
	},
	{
		timestamps: true, // Automatically add createdAt and updatedAt timestamps
	}
);

// Create a compound index to ensure a user can't bookmark the same analysis multiple times
BookmarkSchema.index({ userID: 1, analysisID: 1 }, { unique: true });

const Bookmark = mongoose.models.Bookmark || mongoose.model<IBookmark>("Bookmark", BookmarkSchema);

export default Bookmark;
