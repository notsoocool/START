import { useState } from "react";
import { useRouter } from "next/navigation";
import { TreeNode } from "@/types/treeNode";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteEntryProps {
	treeData: TreeNode[];
}

export default function DeleteEntry({ treeData }: DeleteEntryProps) {
	const router = useRouter();
	const [selectedBook, setSelectedBook] = useState("");
	const [selectedPart1, setSelectedPart1] = useState("");
	const [selectedPart2, setSelectedPart2] = useState("");
	const [selectedChapter, setSelectedChapter] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");

	// Get the current book data with type guards
	const currentBook = treeData.find((b) => b.book === selectedBook);
	const currentPart1 = currentBook?.part1?.find(
		(p) => p.part === selectedPart1
	);
	const currentPart2 = currentPart1?.part2?.find(
		(p) => p.part === selectedPart2
	);

	const chapterOptions = getChapterOptions();

	// Reset dependent selections when parent selection changes
	const handleBookChange = (book: string) => {
		setSelectedBook(book);
		setSelectedPart1("");
		setSelectedPart2("");
		setSelectedChapter("");
	};

	const handlePart1Change = (part1: string) => {
		setSelectedPart1(part1);
		setSelectedPart2("");
		setSelectedChapter("");
	};

	const handlePart2Change = (part2: string) => {
		setSelectedPart2(part2);
		setSelectedChapter("");
	};

	// Delete handlers
	const deleteEntireBook = async () => {
		if (!selectedBook) return;
		setLoading(true);
		setMessage("Deleting entire book...");

		try {
			// Create a timeout promise
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(
					() =>
						reject(
							new Error(
								"Request timeout - operation taking too long"
							)
						),
					20000
				); // 20 second timeout for book deletion
			});

			// Delete book entries
			const bookResponsePromise = fetch(
				`/api/books?book=${selectedBook}`,
				{
					method: "DELETE",
					headers: {
						"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
					},
				}
			);

			// Delete corresponding analysis entries
			const analysisResponsePromise = fetch(
				`/api/analysis/${selectedBook}`,
				{
					method: "DELETE",
					headers: {
						"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
					},
				}
			);

			// Race between the operations and timeout
			const [bookResponse, analysisResponse] = (await Promise.race([
				Promise.all([bookResponsePromise, analysisResponsePromise]),
				timeoutPromise,
			])) as [Response, Response];

			if (!bookResponse.ok) {
				throw new Error(
					`Book deletion failed: ${bookResponse.status} ${bookResponse.statusText}`
				);
			}

			if (!analysisResponse.ok) {
				throw new Error(
					`Analysis deletion failed: ${analysisResponse.status} ${analysisResponse.statusText}`
				);
			}

			const bookData = await bookResponse.json();
			const analysisData = await analysisResponse.json();

			setMessage(`${bookData.message} and ${analysisData.message}`);
			router.refresh();
		} catch (error) {
			console.error("Delete book error:", error);
			if (error instanceof Error && error.message.includes("timeout")) {
				setMessage(
					"Operation is taking longer than expected. Please check the server logs or try again later."
				);
			} else {
				setMessage(
					error instanceof Error
						? error.message
						: "Error occurred while deleting entries"
				);
			}
		} finally {
			setLoading(false);
		}
	};

	const deleteChapter = async () => {
		if (!selectedBook || !selectedChapter) return;
		setLoading(true);
		setMessage("Deleting chapter...");

		try {
			// Create a timeout promise
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(
					() =>
						reject(
							new Error(
								"Request timeout - operation taking too long"
							)
						),
					15000
				); // 15 second timeout
			});

			const part1Param =
				!selectedPart1 || selectedPart1 === "all"
					? "null"
					: selectedPart1;
			const part2Param =
				!selectedPart2 || selectedPart2 === "all"
					? "null"
					: selectedPart2;

			// Delete chapter entries
			const bookResponsePromise = fetch(
				`/api/books/${selectedBook}/${part1Param}/${part2Param}/${selectedChapter}`,
				{
					method: "DELETE",
					headers: {
						"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
					},
				}
			);

			// Delete corresponding analysis entries
			const analysisResponsePromise = fetch(
				`/api/analysis/${selectedBook}/${part1Param}/${part2Param}/${selectedChapter}`,
				{
					method: "DELETE",
					headers: {
						"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
					},
				}
			);

			// Race between the operations and timeout
			const [bookResponse, analysisResponse] = (await Promise.race([
				Promise.all([bookResponsePromise, analysisResponsePromise]),
				timeoutPromise,
			])) as [Response, Response];

			if (!bookResponse.ok) {
				throw new Error(
					`Book deletion failed: ${bookResponse.status} ${bookResponse.statusText}`
				);
			}

			if (!analysisResponse.ok) {
				throw new Error(
					`Analysis deletion failed: ${analysisResponse.status} ${analysisResponse.statusText}`
				);
			}

			const bookData = await bookResponse.json();
			const analysisData = await analysisResponse.json();

			setMessage(`${bookData.message} and ${analysisData.message}`);
			router.refresh();
		} catch (error) {
			console.error("Delete chapter error:", error);
			if (error instanceof Error && error.message.includes("timeout")) {
				setMessage(
					"Operation is taking longer than expected. Please check the server logs or try again later."
				);
			} else {
				setMessage(
					error instanceof Error
						? error.message
						: "Error occurred while deleting chapter"
				);
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="mx-auto max-w-xl space-y-4">
			<Card className="border-red-100 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/20">
				<CardHeader className="space-y-1">
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
						<CardTitle className="text-lg font-semibold">
							Caution!
						</CardTitle>
					</div>
					<p className="text-sm text-muted-foreground">
						These actions are irreversible and will remove both the
						book data and associated analysis. Please double-check
						your selection before proceeding.
					</p>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Selection Controls */}
					<div className="space-y-4">
						<div className="space-y-1.5">
							<label className="text-sm font-medium">
								Book <span className="text-red-500">*</span>
							</label>
							<Select
								value={selectedBook}
								onValueChange={handleBookChange}
								disabled={loading || treeData.length === 0}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select a book to manage deletions" />
								</SelectTrigger>
								<SelectContent>
									{treeData.map((book) => (
										<SelectItem
											key={book.book}
											value={book.book}
										>
											{book.book}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{selectedBook &&
							currentBook?.part1 &&
							currentBook.part1.length > 0 && (
								<div className="space-y-1.5">
									<label className="text-sm font-medium">
										Part 1{" "}
										<span className="text-muted-foreground">
											(optional)
										</span>
									</label>
									<Select
										value={selectedPart1}
										onValueChange={handlePart1Change}
										disabled={loading}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="All parts" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">
												All parts
											</SelectItem>
											{currentBook.part1
												.filter((p) => p.part !== null)
												.map((p) => (
													<SelectItem
														key={p.part}
														value={p.part}
													>
														{p.part}
													</SelectItem>
												))}
										</SelectContent>
									</Select>
								</div>
							)}

						{selectedPart1 &&
							currentPart1?.part2 &&
							currentPart1.part2.length > 0 && (
								<div className="space-y-1.5">
									<label className="text-sm font-medium">
										Part 2{" "}
										<span className="text-muted-foreground">
											(optional)
										</span>
									</label>
									<Select
										value={selectedPart2}
										onValueChange={handlePart2Change}
										disabled={loading}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="All sub-parts" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">
												All sub-parts
											</SelectItem>
											{currentPart1.part2.map((p) => (
												<SelectItem
													key={p.part}
													value={p.part}
												>
													{p.part}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}

						{selectedBook && (
							<div className="space-y-1.5">
								<label className="text-sm font-medium">
									Chapter{" "}
									<span className="text-muted-foreground">
										(optional)
									</span>
								</label>
								<Select
									value={selectedChapter}
									onValueChange={setSelectedChapter}
									disabled={
										loading || chapterOptions.length === 0
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue
											placeholder={
												chapterOptions.length
													? "Select a chapter to delete"
													: "No chapters available for this selection"
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{chapterOptions.map((chapter) => (
											<SelectItem
												key={chapter}
												value={chapter}
											>
												Chapter {chapter}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>

					{/* Action Buttons */}
					<div className="space-y-3">
						<Button
							onClick={deleteEntireBook}
							disabled={!selectedBook || loading}
							variant="destructive"
							className="flex w-full items-center justify-center gap-2"
						>
							<Trash2 className="h-4 w-4" />
							Delete Entire Book and Its Analysis
						</Button>

						<Button
							onClick={deleteChapter}
							disabled={!selectedChapter || loading}
							variant="outline"
							className="flex w-full items-center justify-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-300 dark:hover:bg-orange-950/30 disabled:opacity-60"
						>
							<Trash2 className="h-4 w-4" />
							Delete Selected Chapter and Its Analysis
						</Button>

						<p className="text-xs text-muted-foreground">
							Book-level deletion ignores part and chapter filters
							and will remove all data for the selected book
							across all parts.
						</p>
					</div>

					{/* Status Message */}
					{message && (
						<div className="mt-2 rounded-md border border-muted bg-muted/40 p-3 text-sm">
							{message}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);

	function getChapterOptions(): string[] {
		if (!selectedBook || !currentBook) return [];

		// Case 1: If part1 is not selected or "all", show all chapters
		if (!selectedPart1 || selectedPart1 === "all") {
			if (currentBook.part1 && currentBook.part1.length > 0) {
				// Get chapters from part1 with null part
				const nullPart1 = currentBook.part1.find(
					(p) => p.part === null
				);
				if (nullPart1 && nullPart1.part2[0]) {
					return [...nullPart1.part2[0].chapters].sort(
						(a, b) => Number(a) - Number(b)
					);
				}
			}
			// If no null part1, get all chapters from all parts
			return currentBook.part1
				.flatMap((p1) => p1.part2)
				.flatMap((p2) => p2.chapters)
				.filter(
					(chapter, index, self) => self.indexOf(chapter) === index
				)
				.sort((a, b) => Number(a) - Number(b));
		}

		// Case 2: If part1 is selected but no specific part2 ("all" or empty)
		if ((!selectedPart2 || selectedPart2 === "all") && currentPart1) {
			return currentPart1.part2
				.flatMap((p2) => p2.chapters)
				.filter(
					(chapter, index, self) => self.indexOf(chapter) === index
				)
				.sort((a, b) => Number(a) - Number(b));
		}

		// Case 3: Both part1 and part2 are selected
		if (currentPart2) {
			return [...currentPart2.chapters].sort(
				(a, b) => Number(a) - Number(b)
			);
		}

		return [];
	}
}
