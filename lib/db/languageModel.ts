import mongoose, { Schema, Document } from "mongoose";

export interface Language extends Document {
	code: string; // ISO 639-1 language code (2 letters)
	name: string; // Language name (e.g., "Sanskrit", "French")
}

const LanguageSchema: Schema = new Schema(
	{
		code: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
			validate: {
				validator: function (v: string) {
					return /^[a-z]{2}$/.test(v);
				},
				message: "Language code must be a valid ISO 639-1 code (2 letters)",
			},
		},
		name: {
			type: String,
			required: true,
			trim: true,
		},
	},
	{
		timestamps: true, // Adds createdAt and updatedAt timestamps
	}
);

// Ensure code is unique
LanguageSchema.index({ code: 1 }, { unique: true });

export default mongoose.models.Language ||
	mongoose.model<Language>("Language", LanguageSchema);

