import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAHShlokas extends Document {
	chaptno: string;
	slokano: string;
	spart1: string;
	spart2?: string; // Optional
}

const ahshlokaSchema: Schema = new mongoose.Schema({
	chaptno: {
		type: String,
		required: true,
	},
	slokano: {
		type: String,
		required: true,
	},
	spart1: {
		type: String,
		required: true,
	},
	spart2: {
		type: String, // Optional field
	},
});

const AHShloka: Model<IAHShlokas> =
	mongoose.models.AHShloka ||
	mongoose.model<IAHShlokas>("AHShloka", ahshlokaSchema);

export default AHShloka;
