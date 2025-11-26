import mongoose, { Schema, Document } from "mongoose";

export interface Analysis extends Document {
	chaptno: string;
	slokano: string;
	sentno: string;
	bgcolor?: string; // Optional field
	graph: string;
	anvaya_no: string;
	word: string;
	poem: string;
	sandhied_word: string;
	morph_analysis: string;
	morph_in_context: string;
	kaaraka_sambandha: string;
	possible_relations: string;
	meanings: Map<string, string>; // Dictionary to store meanings in multiple languages (key: language code, value: meaning)
	hindi_meaning?: string; // @deprecated - Use meanings.get('hi') instead. Kept for backward compatibility
	english_meaning?: string; // @deprecated - Use meanings.get('en') instead. Kept for backward compatibility
	samAsa: string;
	prayoga: string;
	sarvanAma: string;
	name_classification: string;
	book: string; // New field to store the book name
	part1?: string; // New optional field
	part2?: string; // New optional field
}

const AnalysisSchema: Schema = new Schema({
	chaptno: {
		type: String,
		required: true,
	},
	slokano: {
		type: String,
		required: true,
	},
	sentno: {
		type: String,
		required: true,
	},
	bgcolor: {
		type: String,
		required: false,
	},
	graph: {
		type: String,
		required: true,
	},
	anvaya_no: {
		type: String,
		required: true,
	},
	word: {
		type: String,
		required: true,
	},
	poem: {
		type: String,
		required: true,
	},
	sandhied_word: {
		type: String,
		required: true,
	},
	morph_analysis: {
		type: String,
		required: true,
	},
	morph_in_context: {
		type: String,
		required: true,
	},
	kaaraka_sambandha: {
		type: String,
		required: true,
	},
	possible_relations: {
		type: String,
		required: true,
	},
	meanings: {
		type: Map,
		of: String,
		required: false,
		default: () => new Map(),
	},
	hindi_meaning: {
		type: String,
		required: false,
	},
	english_meaning: {
		type: String,
		required: false,
	},
	samAsa: {
		type: String,
		required: true,
	},
	prayoga: {
		type: String,
		required: true,
	},
	sarvanAma: {
		type: String,
		required: true,
	},
	name_classification: {
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
});

export default mongoose.models.Analysis ||
	mongoose.model<Analysis>("Analysis", AnalysisSchema);
