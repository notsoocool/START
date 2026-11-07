import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApiAccessRequest extends Document {
	userId: string;
	userName: string;
	books: string[];
	note?: string;
	status: "pending" | "approved" | "rejected";
	reviewedBy?: string | null;
	reviewedAt?: Date | null;
	reviewNote?: string | null;
	createdAt: Date;
}

const schema = new Schema<IApiAccessRequest>({
	userId: { type: String, required: true, index: true },
	userName: { type: String, required: true },
	books: { type: [String], required: true },
	note: { type: String, default: "" },
	status: {
		type: String,
		enum: ["pending", "approved", "rejected"],
		default: "pending",
		index: true,
	},
	reviewedBy: { type: String, default: null },
	reviewedAt: { type: Date, default: null },
	reviewNote: { type: String, default: null },
	createdAt: { type: Date, default: Date.now },
});

const ApiAccessRequest: Model<IApiAccessRequest> =
	mongoose.models.ApiAccessRequest ||
	mongoose.model<IApiAccessRequest>("ApiAccessRequest", schema);

export default ApiAccessRequest;
