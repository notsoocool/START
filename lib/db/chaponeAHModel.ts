import mongoose, { Schema, Document, Model } from 'mongoose';

interface ChaponeAHDocument extends Document {
    id: string;
    data: Array<{
        chpatno: string;
        slokano: string;
        sentno: string;
        bgcolor?: string; // Make bgcolor optional
        graph: string;
        anvaya_no: string;
        word: string;
        poem: string;
        sandhied_word: string;
        morph_analysis: string;
        morph_in_context: string;
        kaaraka_sambandha: string;
        possible_relations: string;
        hindi_meaning?: string; // Make hindi_meaning optional
        english_meaning: string;
        samAsa: string;
        prayoga: string;
        sarvanAma: string;
        name_classification: string;
    }>;
}

const ChaponeAHSchema = new Schema<ChaponeAHDocument>({
    id: { type: String, required: true },
    data: [{
        chpatno: { type: String, required: true },
        slokano: { type: String, required: true },
        sentno: { type: String, required: true },
        bgcolor: { type: String, required: false }, // Make bgcolor optional
        graph: { type: String, required: true },
        anvaya_no: { type: String, required: true },
        word: { type: String, required: true },
        poem: { type: String, required: true },
        sandhied_word: { type: String, required: true },
        morph_analysis: { type: String, required: true },
        morph_in_context: { type: String, required: true },
        kaaraka_sambandha: { type: [String], required: true },
        possible_relations: { type: String, required: true },
        hindi_meaning: { type: String, required: false }, // Make hindi_meaning optional
        english_meaning: { type: String, required: true },
        samAsa: { type: String, required: true },
        prayoga: { type: String, required: true },
        sarvanAma: { type: String, required: true },
        name_classification: { type: String, required: true },
    }]
});

// Use a condition to check if the model is already compiled
const ChaponeAH = mongoose.models.ChaponeAH || mongoose.model<ChaponeAHDocument>('ChaponeAH', ChaponeAHSchema);

export default ChaponeAH;
