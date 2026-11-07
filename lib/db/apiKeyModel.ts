import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApiKey extends Document {
	userId: string;
	keyPrefix: string;
	keyHash: string;
	status: "active" | "revoked";
	createdAt: Date;
	revokedAt?: Date | null;
	lastUsedAt?: Date | null;
}

const schema = new Schema<IApiKey>({
	userId: { type: String, required: true, index: true },
	keyPrefix: { type: String, required: true },
	keyHash: { type: String, required: true, unique: true },
	status: { type: String, enum: ["active", "revoked"], default: "active" },
	createdAt: { type: Date, default: Date.now },
	revokedAt: { type: Date, default: null },
	lastUsedAt: { type: Date, default: null },
});

const ApiKey: Model<IApiKey> =
	mongoose.models.ApiKey || mongoose.model<IApiKey>("ApiKey", schema);

export default ApiKey;
