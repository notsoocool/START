import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApiBookGrant extends Document {
	userId: string;
	book: string;
	requestId: string;
	grantedBy: string;
	grantedAt: Date;
	revokedAt?: Date | null;
}

const schema = new Schema<IApiBookGrant>({
	userId: { type: String, required: true, index: true },
	book: { type: String, required: true },
	requestId: { type: String, required: true },
	grantedBy: { type: String, required: true },
	grantedAt: { type: Date, default: Date.now },
	revokedAt: { type: Date, default: null },
});

schema.index({ userId: 1, book: 1 });

const ApiBookGrant: Model<IApiBookGrant> =
	mongoose.models.ApiBookGrant ||
	mongoose.model<IApiBookGrant>("ApiBookGrant", schema);

export default ApiBookGrant;
