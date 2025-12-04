"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ErrorDisplay } from "@/components/global/ErrorDisplay";

// Define the expected structure for validation
interface ShlokaData {
	chaptno: string;
	slokano: string;
	spart: string;
}

interface AnalysisData {
	chaptno: string;
	slokano: string;
	sentno: string;
	bgcolor?: string;
	graph: string;
	anvaya_no: string;
	word: string;
	poem: string;
	sandhied_word: string;
	morph_analysis: string;
	morph_in_context: string;
	kaaraka_sambandha: string;
	possible_relations: string;
	hindi_meaning?: string;
	english_meaning: string;
	samAsa: string;
	prayoga: string;
	sarvanAma: string;
	name_classification: string;
}

const UploadJsonPage = () => {
	const [book, setBook] = useState("");
	const [part1, setPart1] = useState("");
	const [part2, setPart2] = useState("");
	const [shlokaData, setShlokaData] = useState("");
	const [analysisData, setAnalysisData] = useState("");
	const [shlokaFileName, setShlokaFileName] = useState("");
	const [analysisFileName, setAnalysisFileName] = useState("");
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<{ type: string; message: string } | null>(null);
	const [validationErrors, setValidationErrors] = useState<{
		shloka: string[];
		analysis: string[];
	}>({
		shloka: [],
		analysis: [],
	});
	const [isValid, setIsValid] = useState(false);

	// Validate shloka data against the expected schema
	const validateShlokaData = (data: any): string[] => {
		const errors: string[] = [];

		// Check if data is an array
		if (!Array.isArray(data)) {
			errors.push("Shloka data must be an array of objects");
			return errors;
		}

		// Check each item in the array
		data.forEach((item, index) => {
			// Check required fields
			if (!item.chaptno) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'chaptno'`);
			if (!item.slokano) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'slokano'`);
			if (!item.spart) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'spart'`);

			// Check field types
			if (item.chaptno && typeof item.chaptno !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'chaptno' must be a string`);
			if (item.slokano && typeof item.slokano !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'slokano' must be a string`);
			if (item.spart && typeof item.spart !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'spart' must be a string`);

			// Check optional fields if present
		});

		return errors;
	};

	// Validate analysis data against the expected schema
	const validateAnalysisData = (data: any): string[] => {
		const errors: string[] = [];

		// Check if data is an array
		if (!Array.isArray(data)) {
			errors.push("Analysis data must be an array of objects");
			return errors;
		}

		// Check each item in the array
		data.forEach((item, index) => {
			// Check required fields
			if (!item.chaptno) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'chaptno'`);
			if (!item.slokano) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'slokano'`);
			if (!item.sentno) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'sentno'`);
			if (!item.graph) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'graph'`);
			if (!item.anvaya_no) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'anvaya_no'`);
			if (!item.word) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'word'`);
			if (!item.poem) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'poem'`);
			if (!item.sandhied_word) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'sandhied_word'`);
			if (!item.morph_analysis) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'morph_analysis'`);
			if (!item.morph_in_context) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'morph_in_context'`);
			if (!item.kaaraka_sambandha) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'kaaraka_sambandha'`);
			if (!item.possible_relations) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'possible_relations'`);
			if (!item.english_meaning) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'english_meaning'`);
			if (!item.samAsa) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'samAsa'`);
			if (!item.prayoga) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'prayoga'`);
			if (!item.sarvanAma) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'sarvanAma'`);
			if (!item.name_classification) errors.push(`Anvaya no.${item.anvaya_no}: Missing required field 'name_classification'`);

			// Check field types
			if (item.chaptno && typeof item.chaptno !== "string") errors.push(`Anvaya no. ${item.anvaya_no}: 'chaptno' must be a string`);
			if (item.slokano && typeof item.slokano !== "string") errors.push(`Anvaya no. ${item.anvaya_no}: 'slokano' must be a string`);
			if (item.sentno && typeof item.sentno !== "string") errors.push(`Anvaya no. ${item.anvaya_no}: 'sentno' must be a string`);
			if (item.graph && typeof item.graph !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'graph' must be a string`);
			if (item.anvaya_no && typeof item.anvaya_no !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'anvaya_no' must be a string`);
			if (item.word && typeof item.word !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'word' must be a string`);
			if (item.poem && typeof item.poem !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'poem' must be a string`);
			if (item.sandhied_word && typeof item.sandhied_word !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'sandhied_word' must be a string`);
			if (item.morph_analysis && typeof item.morph_analysis !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'morph_analysis' must be a string`);
			if (item.morph_in_context && typeof item.morph_in_context !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'morph_in_context' must be a string`);
			if (item.kaaraka_sambandha && typeof item.kaaraka_sambandha !== "string")
				errors.push(`Anvaya no.${item.anvaya_no}: 'kaaraka_sambandha' must be a string`);
			if (item.possible_relations && typeof item.possible_relations !== "string")
				errors.push(`Anvaya no.${item.anvaya_no}: 'possible_relations' must be a string`);
			if (item.english_meaning && typeof item.english_meaning !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'english_meaning' must be a string`);
			if (item.samAsa && typeof item.samAsa !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'samAsa' must be a string`);
			if (item.prayoga && typeof item.prayoga !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'prayoga' must be a string`);
			if (item.sarvanAma && typeof item.sarvanAma !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'sarvanAma' must be a string`);
			if (item.name_classification && typeof item.name_classification !== "string")
				errors.push(`Anvaya no.${item.anvaya_no}: 'name_classification' must be a string`);

			// Check optional fields if present
			if (item.bgcolor && typeof item.bgcolor !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'bgcolor' must be a string`);
			if (item.hindi_meaning && typeof item.hindi_meaning !== "string") errors.push(`Anvaya no.${item.anvaya_no}: 'hindi_meaning' must be a string`);
		});

		return errors;
	};

	// Validate both files whenever they change
	useEffect(() => {
		const newValidationErrors = {
			shloka: [] as string[],
			analysis: [] as string[],
		};

		// Validate shloka data if present
		if (shlokaData) {
			try {
				const parsedData = JSON.parse(shlokaData);
				newValidationErrors.shloka = validateShlokaData(parsedData);
			} catch (error) {
				newValidationErrors.shloka = ["Invalid JSON format"];
			}
		}

		// Validate analysis data if present
		if (analysisData) {
			try {
				const parsedData = JSON.parse(analysisData);
				newValidationErrors.analysis = validateAnalysisData(parsedData);
			} catch (error) {
				newValidationErrors.analysis = ["Invalid JSON format"];
			}
		}

		setValidationErrors(newValidationErrors);

		// Check if both files are valid and ensure boolean type
		const isShlokaValid = Boolean(shlokaData) && newValidationErrors.shloka.length === 0;
		const isAnalysisValid = Boolean(analysisData) && newValidationErrors.analysis.length === 0;

		setIsValid(Boolean(isShlokaValid && isAnalysisValid));
	}, [shlokaData, analysisData]);

	const handleFileUpload = async (file: File, setData: (value: string) => void, setFileName: (name: string) => void) => {
		try {
			const text = await file.text();
			// Validate if it's a valid JSON
			JSON.parse(text);
			setData(text);
			setFileName(file.name);
			toast.success(`${file.name} uploaded successfully`);
		} catch (error) {
			setError({
				type: "INVALID_JSON",
				message: "The file you uploaded is not a valid JSON file.",
			});
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Double-check validation before submission
		if (!isValid) {
			setError({
				type: "VALIDATION_ERROR",
				message: "Please fix validation errors before submitting.",
			});
			return;
		}

		setIsUploading(true);
		const loadingToast = toast.loading("Uploading files...");

		try {
			const response = await fetch("/api/uploadJson", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
				body: JSON.stringify({
					book,
					part1,
					part2,
					shlokaData: JSON.parse(shlokaData),
					analysisData: JSON.parse(analysisData),
				}),
			});

			const result = await response.json();
			toast.dismiss(loadingToast);
			if (result.success) {
				toast.success(result.message);
			} else {
				setError({
					type: "UPLOAD_ERROR",
					message: result.error || "Failed to upload data",
				});
			}
		} catch (error) {
			toast.dismiss(loadingToast);
			setError({
				type: "UPLOAD_ERROR",
				message: "An error occurred while uploading the data.",
			});
		} finally {
			setIsUploading(false);
		}
	};

	if (error) {
		return <ErrorDisplay error={error} onBack={() => setError(null)} />;
	}

	return (
		<div className="w-full space-y-6">
			<form
				onSubmit={handleSubmit}
				className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
			>
				<div className="space-y-1.5">
					<label
						htmlFor="book"
						className="block text-sm font-medium text-muted-foreground/80"
					>
						Book
					</label>
					<Input
						id="book"
						type="text"
						value={book}
						onChange={(e) => setBook(e.target.value)}
						required
						className="mt-1 max-w-xs"
						placeholder="e.g. Bhagavad Gita"
					/>
				</div>
				<div className="space-y-1.5">
					<label
						htmlFor="part1"
						className="block text-sm font-medium text-muted-foreground/80"
					>
						Part 1
					</label>
					<Input
						id="part1"
						type="text"
						value={part1}
						onChange={(e) => setPart1(e.target.value)}
						className="mt-1 max-w-xs"
						placeholder="Optional"
					/>
				</div>
				<div className="space-y-1.5">
					<label
						htmlFor="part2"
						className="block text-sm font-medium text-muted-foreground/80"
					>
						Part 2
					</label>
					<Input
						id="part2"
						type="text"
						value={part2}
						onChange={(e) => setPart2(e.target.value)}
						className="mt-1 max-w-xs"
						placeholder="Optional"
					/>
				</div>
			</form>

			<form onSubmit={handleSubmit} className="space-y-6">
				<div>
					<label
						htmlFor="shlokaData"
						className="block text-sm font-medium text-muted-foreground/80"
					>
						Shloka Data (JSON)
					</label>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								className="w-32"
								onClick={() =>
									document
										.getElementById("shlokaFile")
										?.click()
								}
							>
								Upload JSON
							</Button>
							<span className="text-sm text-muted-foreground">
								{shlokaFileName || "No file chosen"}
							</span>
							<input
								id="shlokaFile"
								type="file"
								accept=".json"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file)
										handleFileUpload(
											file,
											setShlokaData,
											setShlokaFileName
										);
								}}
							/>
						</div>
						<Textarea
							value={shlokaData}
							onChange={(e) =>
								setShlokaData(e.target.value)
							}
							required
							rows={5}
							placeholder="Or paste JSON here"
						/>
						{validationErrors.shloka.length > 0 && (
							<div className="mt-1 text-sm text-red-500">
								<strong>Validation Errors:</strong>
								<ul className="list-disc pl-5">
									{validationErrors.shloka.map(
										(error, index) => (
											<li key={index}>{error}</li>
										)
									)}
								</ul>
							</div>
						)}
					</div>
				</div>
				<div>
					<label
						htmlFor="analysisData"
						className="block text-sm font-medium text-muted-foreground/80"
					>
						Analysis Data (JSON)
					</label>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								className="w-32"
								onClick={() =>
									document
										.getElementById("analysisFile")
										?.click()
								}
							>
								Upload JSON
							</Button>
							<span className="text-sm text-muted-foreground">
								{analysisFileName || "No file chosen"}
							</span>
							<input
								id="analysisFile"
								type="file"
								accept=".json"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file)
										handleFileUpload(
											file,
											setAnalysisData,
											setAnalysisFileName
										);
								}}
							/>
						</div>
						<Textarea
							value={analysisData}
							onChange={(e) =>
								setAnalysisData(e.target.value)
							}
							required
							rows={5}
							placeholder="Or paste JSON here"
						/>
						{validationErrors.analysis.length > 0 && (
							<div className="mt-1 text-sm text-red-500">
								<strong>Validation Errors:</strong>
								<ul className="list-disc pl-5">
									{validationErrors.analysis.map(
										(error, index) => (
											<li key={index}>{error}</li>
										)
									)}
								</ul>
							</div>
						)}
					</div>
				</div>
				<div className="flex w-full justify-end pt-3">
					<Button
						className="w-32"
						type="submit"
						disabled={isUploading || !isValid}
					>
						{isUploading ? "Uploading..." : "Upload"}
					</Button>
				</div>
			</form>
		</div>
	);
};

export default UploadJsonPage;
