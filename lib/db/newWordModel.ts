import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWord extends Document {
	timestamp: Date;
	word: string;
	category: string;
	// सुबन्तम् section 1
	praatipadikam1: string;
	lingah1: string;
	vibhaktih1: string;
	vachanam1: string;
	// तिङन्तम् section 2
	dhaatuh2: string;
	upasargah2: string;
	sanadiPratyayah2: string;
	prayogah2: string;
	lakaarah: string;
	purushah: string;
	vachanam2: string;
	padi2: string;
	ganah2: string;
	// कृत्-नाम section
	krdantaPraatipadikam: string;
	upasargah3: string;
	sanadiPratyayah3: string;
	krtPratyayah3: string;
	prayogah: string;
	ganah3: string;
	dhaatuh3: string;
	lingah3: string;
	vibhaktih3: string;
	vachanam3: string;
	// कृत्-अव्ययम् main section
	dhaatuh: string;
	upasargah: string;
	sanadiPratyayah: string;
	krtPratyayah: string;
	ganah: string;
	// तद्धित-नाम section 5
	praatipadikam5: string;
	taddhitaPratyayah5: string;
	lingah: string;
	vibhaktih: string;
	vachanam: string;
	// तद्धित-अव्ययम् section 6
	praatipadikam: string;
	taddhitaPratyayah: string;
	// Metadata
	status: string;
	createdAt: Date;
}

const wordSchema: Schema = new mongoose.Schema({
	timestamp: { type: Date, required: true },
	word: { type: String, required: true },
	category: { type: String, required: true },
	// सुबन्तम् section 1
	praatipadikam1: String,
	lingah1: String,
	vibhaktih1: String,
	vachanam1: String,
	// तिङन्तम् section 2
	dhaatuh2: String,
	upasargah2: String,
	sanadiPratyayah2: String,
	prayogah2: String,
	lakaarah: String,
	purushah: String,
	vachanam2: String,
	padi2: String,
	ganah2: String,
	// कृत्-नाम section
	krdantaPraatipadikam: String,
	upasargah3: String,
	sanadiPratyayah3: String,
	krtPratyayah3: String,
	prayogah: String,
	ganah3: String,
	dhaatuh3: String,
	lingah3: String,
	vibhaktih3: String,
	vachanam3: String,
	// कृत्-अव्ययम् main section
	dhaatuh: String,
	upasargah: String,
	sanadiPratyayah: String,
	krtPratyayah: String,
	ganah: String,
	// तद्धित-नाम section 5
	praatipadikam5: String,
	taddhitaPratyayah5: String,
	lingah: String,
	vibhaktih: String,
	vachanam: String,
	// तद्धित-अव्ययम् section 6
	praatipadikam: String,
	taddhitaPratyayah: String,
	// Metadata
	status: { type: String, default: "pending" },
	createdAt: { type: Date, default: Date.now },
});

const Word: Model<IWord> = mongoose.models.Word || mongoose.model<IWord>("Word", wordSchema);

export default Word;
