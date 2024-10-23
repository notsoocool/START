import mongoose, { Schema, Document } from "mongoose";

export interface Shloka extends Document {
  chaptno: string;
  slokano: string;
  spart1: string;
  spart2?: string; // Optional field
  book: string; // New field to store the book name
  part1?: string; // New optional field
  part2?: string; // New optional field
}

const ShlokaSchema: Schema = new Schema({
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
    type: String,
    required: false,
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

export default mongoose.models.Shloka || mongoose.model<Shloka>("Shloka", ShlokaSchema);
