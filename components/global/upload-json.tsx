"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorDisplay } from "@/components/global/ErrorDisplay";

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
		<div className="w-full p-8">
			<form onSubmit={handleSubmit} className="space-y-4 grid">
				<div>
					<label htmlFor="title" className="block text-sm font-medium text-muted-foreground/80">
						Book:
					</label>
					<Input id="title" type="text" value={book} onChange={(e) => setBook(e.target.value)} required className="mt-1  max-w-[15vw]" />
				</div>
				<div>
					<label htmlFor="title" className="block text-sm font-medium text-muted-foreground/80">
						Part 1:
					</label>
					<Input id="title" type="text" value={part1} onChange={(e) => setPart1(e.target.value)} className="mt-1  max-w-[15vw]" />
				</div>
				<div>
					<label htmlFor="title" className="block text-sm font-medium text-muted-foreground/80">
						Part 2:
					</label>
					<Input id="title" type="text" value={part2} onChange={(e) => setPart2(e.target.value)} className="mt-1  max-w-[15vw]" />
				</div>
				<div>
					<label htmlFor="shlokaData" className="block text-sm font-medium text-muted-foreground/80">
						Shloka Data (JSON):
					</label>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Button type="button" variant="outline" className="w-32" onClick={() => document.getElementById("shlokaFile")?.click()}>
								Upload JSON
							</Button>
							<span className="text-sm text-muted-foreground">{shlokaFileName || "No file chosen"}</span>
							<input
								id="shlokaFile"
								type="file"
								accept=".json"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) handleFileUpload(file, setShlokaData, setShlokaFileName);
								}}
							/>
						</div>
						<Textarea value={shlokaData} onChange={(e) => setShlokaData(e.target.value)} required rows={5} placeholder="Or paste JSON here" />
					</div>
				</div>
				<div>
					<label htmlFor="analysisData" className="block text-sm font-medium text-muted-foreground/80">
						Analysis Data (JSON):
					</label>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Button type="button" variant="outline" className="w-32" onClick={() => document.getElementById("analysisFile")?.click()}>
								Upload JSON
							</Button>
							<span className="text-sm text-muted-foreground">{analysisFileName || "No file chosen"}</span>
							<input
								id="analysisFile"
								type="file"
								accept=".json"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) handleFileUpload(file, setAnalysisData, setAnalysisFileName);
								}}
							/>
						</div>
						<Textarea value={analysisData} onChange={(e) => setAnalysisData(e.target.value)} required rows={5} placeholder="Or paste JSON here" />
					</div>
				</div>
				<div className="flex w-full justify-end pt-5">
					<Button className="w-24" type="submit" disabled={isUploading}>
						{isUploading ? "Uploading..." : "Upload"}
					</Button>
				</div>
			</form>
		</div>
	);
};

export default UploadJsonPage;
