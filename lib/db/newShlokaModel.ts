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
	},
	{
		timestamps: true,
	}
);

export default mongoose.models.Shloka || mongoose.model<Shloka>("Shloka", ShlokaSchema);
