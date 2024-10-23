"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

const UploadJsonPage = () => {
	const [book, setBook] = useState("");
	const [part1, setPart1] = useState("");
	const [part2, setPart2] = useState("");
	const [shlokaData, setShlokaData] = useState("");
	const [analysisData, setAnalysisData] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const response = await fetch("/api/uploadJson", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					book,
					part1,
					part2,
					shlokaData: JSON.parse(shlokaData), // Convert string to JSON
					analysisData: JSON.parse(analysisData), // Convert string to JSON
				}),
			});

			const result = await response.json();
			if (result.success) {
				toast.success(result.message);
			} else {
				toast.error(result.error);
			}
		} catch (error) {
			toast.error("An error occurred while uploading the data.");
		}
	};

	return (
		<div className="w-full p-8">
			<form onSubmit={handleSubmit} className="space-y-4 grid">
				<div>
					<label
						htmlFor="title"
						className="block text-sm font-medium text-muted-foreground/80"
					>
						Book:
					</label>
					<Input
						id="title"
						type="text"
						value={book}
						onChange={(e) => setBook(e.target.value)}
						required
						className="mt-1  max-w-[15vw]"
					/>
				</div>
				<div>
					<label
						htmlFor="title"
						className="block text-sm font-medium text-muted-foreground/80"
					>
						Part 1:
					</label>
					<Input
						id="title"
						type="text"
						value={part1}
						onChange={(e) => setPart1(e.target.value)}
				
						className="mt-1  max-w-[15vw]"
					/>
				</div>
				<div>
					<label
						htmlFor="title"
						className="block text-sm font-medium text-muted-foreground/80"
					>
						Part 2:
					</label>
					<Input
						id="title"
						type="text"
						value={part2}
						onChange={(e) => setPart2(e.target.value)}
				
						className="mt-1  max-w-[15vw]"
					/>
				</div>
				<div>
					<label
						htmlFor="title"
						className="block text-sm font-medium text-muted-foreground/80"
					>
						Shloka Data (JSON):
					</label>
					<Textarea
						value={shlokaData}
						onChange={(e) => setShlokaData(e.target.value)}
						required
						rows={5}
					/>
				</div>
				<div>
					<label
						htmlFor="title"
						className="block text-sm font-medium text-muted-foreground/80"
					>
						Analysis Data (JSON):
					</label>
					<Textarea
						value={analysisData}
						onChange={(e) => setAnalysisData(e.target.value)}
						required
						rows={5}
					/>
				</div>
                <div className="flex w-full justify-end pt-5">
				<Button className="w-24" type="submit">Upload</Button>
                </div>
            </form>
		</div>
	);
};

export default UploadJsonPage;
