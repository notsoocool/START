import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPresence extends Document {
	userID: string;
	lastActiveAt: Date;
}

const presenceSchema: Schema = new mongoose.Schema(
	{
		userID: {
			type: String,
			required: true,
			unique: true,
		},
		lastActiveAt: {
			type: Date,
			required: true,
			default: Date.now,
		},
	},
	{ timestamps: true }
);

// TTL index: remove documents older than 1 hour (safety cleanup)
presenceSchema.index({ lastActiveAt: 1 }, { expireAfterSeconds: 3600 });

const Presence: Model<IPresence> =
	mongoose.models.Presence || mongoose.model<IPresence>("Presence", presenceSchema);

export default Presence;
