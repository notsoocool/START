import mongoose, { Schema, Document } from "mongoose";

export interface Shloka extends Document {
	chaptno: string;
	slokano: string;
	spart: string;
	book: string;
	part1?: string;
	part2?: string;
	userPublished: boolean;
	groupPublished: boolean;
	locked: boolean;
	owner: string | null;
	clusteredAt?: Date | null;
	clusterUndo?: {
		slokano: string;
		spart: string;
		userPublished: boolean;
		groupPublished: boolean;
		locked: boolean;
		owner: string | null;
		sentnoMap: { from: string; to: string; rows: number }[];
	}[];
}

const ShlokaSchema: Schema = new Schema(
	{
		chaptno: {
			type: String,
			required: true,
		},
		slokano: {
			type: String,
			required: true,
		},
		spart: {
			type: String,
			required: true,
		},
		book: {
			type: String,
			required: true,
		},
		part1: {
			type: String,
			required: false,
		},
		part2: {
			type: String,
			required: false,
		},
		userPublished: {
			type: Boolean,
			default: false,
		},
		groupPublished: {
			type: Boolean,
			default: false,
		},
		locked: {
			type: Boolean,
			default: false,
		},
		owner: {
			type: String,
			required: false,
			default: null,
		},
		clusteredAt: {
			type: Date,
			required: false,
		},
		clusterUndo: {
			type: [
				{
					slokano: { type: String, required: true },
					spart: { type: String, required: true },
					userPublished: { type: Boolean, default: false },
					groupPublished: { type: Boolean, default: false },
					locked: { type: Boolean, default: false },
					owner: { type: String, default: null },
					sentnoMap: {
						type: [
							{
								from: { type: String, required: true },
								to: { type: String, required: true },
								rows: { type: Number, required: true },
							},
						],
						default: [],
					},
				},
			],
			required: false,
		},
	},
	{
		timestamps: true,
	}
);

export default mongoose.models.Shloka || mongoose.model<Shloka>("Shloka", ShlokaSchema);
