import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Word from "@/lib/db/newWordModel";

export async function POST(request: Request) {
	try {
		await dbConnect();
		const formData = await request.json();

		// Extract data from the form submission
		const word = {
			timestamp: new Date(formData.Timestamp),
			word: formData.Word,
			category: formData.Category,

			// सुबन्तम् section 1
			praatipadikam1: formData["प्रातिपदिकम्[1]"],
			lingah1: formData["लिङ्गः[1]"],
			vibhaktih1: formData["विभक्तिः[1]"],
			vachanam1: formData["वचनम्[1]"],

			// तिङन्तम् section 2
			dhaatuh2: formData["धातुः[2]"],
			upasargah2: formData["उपसर्गः[2]"],
			sanadiPratyayah2: formData["सनादि-प्रत्ययः[2]"],
			prayogah2: formData["प्रयोगः[2]"],
			lakaarah: formData["लकारः"],
			purushah: formData["पुरुषः"],
			vachanam2: formData["वचनम्[2]"],
			padi2: formData["पदी[2]"],
			ganah2: formData["गणः[2]"],

			// कृत्-नाम section
			krdantaPraatipadikam: formData["कृदन्त-प्रातिपदिकम्"],
			upasargah3: formData["उपसर्गः[3]"],
			sanadiPratyayah3: formData["सनादि-प्रत्ययः[3]"],
			krtPratyayah3: formData["कृत्-प्रत्ययः[3]"],
			prayogah: formData["प्रयोगः"],
			ganah3: formData["गणः[3]"],
			dhaatuh3: formData["धातुः[3]"],
			lingah3: formData["लिङ्गः[3]"],
			vibhaktih3: formData["विभक्तिः[3]"],
			vachanam3: formData["वचनम्[3]"],

			// कृत्-अव्ययम् main section
			dhaatuh: formData["धातुः"],
			upasargah: formData["उपसर्गः"],
			sanadiPratyayah: formData["सनादि-प्रत्ययः"],
			krtPratyayah: formData["कृत्-प्रत्ययः"],
			ganah: formData["गणः"],

			// तद्धित-नाम section 5
			praatipadikam5: formData["प्रातिपदिकम्[5]"],
			taddhitaPratyayah5: formData["तद्धित-प्रत्ययः[5]"],
			lingah: formData["लिङ्गः"],
			vibhaktih: formData["विभक्तिः"],
			vachanam: formData["वचनम्"],

			// तद्धित-अव्ययम् section 6
			praatipadikam: formData["प्रातिपदिकम्"],
			taddhitaPratyayah: formData["तद्धित-प्रत्ययः"],

			// Metadata
			status: "pending",
			createdAt: new Date(),
		};

		// Store in database
		const savedWord = await Word.create(word);

		return NextResponse.json({
			success: true,
			message: "Word submitted successfully",
			word: savedWord,
		});
	} catch (error) {
		console.error("Error saving word:", error);
		return NextResponse.json({ success: false, message: "Failed to save word" }, { status: 500 });
	}
}
