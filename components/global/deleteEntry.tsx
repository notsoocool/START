import { useState } from "react";
import { useRouter } from "next/navigation";
import { TreeNode } from "@/types/treeNode";

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
	const currentPart1 = currentBook?.part1?.find((p) => p.part === selectedPart1);
	const currentPart2 = currentPart1?.part2?.find((p) => p.part === selectedPart2);

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
				setTimeout(() => reject(new Error("Request timeout - operation taking too long")), 20000); // 20 second timeout for book deletion
			});

			// Delete book entries
			const bookResponsePromise = fetch(`/api/books?book=${selectedBook}`, {
				method: "DELETE",
				headers: {
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
			});

			// Delete corresponding analysis entries
			const analysisResponsePromise = fetch(`/api/analysis/${selectedBook}`, {
				method: "DELETE",
				headers: {
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
			});

			// Race between the operations and timeout
			const [bookResponse, analysisResponse] = (await Promise.race([Promise.all([bookResponsePromise, analysisResponsePromise]), timeoutPromise])) as [
				Response,
				Response
			];

			if (!bookResponse.ok) {
				throw new Error(`Book deletion failed: ${bookResponse.status} ${bookResponse.statusText}`);
			}

			if (!analysisResponse.ok) {
				throw new Error(`Analysis deletion failed: ${analysisResponse.status} ${analysisResponse.statusText}`);
			}

			const bookData = await bookResponse.json();
			const analysisData = await analysisResponse.json();

			setMessage(`${bookData.message} and ${analysisData.message}`);
			router.refresh();
		} catch (error) {
			console.error("Delete book error:", error);
			if (error instanceof Error && error.message.includes("timeout")) {
				setMessage("Operation is taking longer than expected. Please check the server logs or try again later.");
			} else {
				setMessage(error instanceof Error ? error.message : "Error occurred while deleting entries");
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
				setTimeout(() => reject(new Error("Request timeout - operation taking too long")), 15000); // 15 second timeout
			});

			// Delete chapter entries
			const bookResponsePromise = fetch(`/api/books/${selectedBook}/${selectedPart1 || "null"}/${selectedPart2 || "null"}/${selectedChapter}`, {
				method: "DELETE",
				headers: {
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
			});

			// Delete corresponding analysis entries
			const analysisResponsePromise = fetch(`/api/analysis/${selectedBook}/${selectedPart1 || "null"}/${selectedPart2 || "null"}/${selectedChapter}`, {
				method: "DELETE",
				headers: {
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
			});

			// Race between the operations and timeout
			const [bookResponse, analysisResponse] = (await Promise.race([Promise.all([bookResponsePromise, analysisResponsePromise]), timeoutPromise])) as [
				Response,
				Response
			];

			if (!bookResponse.ok) {
				throw new Error(`Book deletion failed: ${bookResponse.status} ${bookResponse.statusText}`);
			}

			if (!analysisResponse.ok) {
				throw new Error(`Analysis deletion failed: ${analysisResponse.status} ${analysisResponse.statusText}`);
			}

			const bookData = await bookResponse.json();
			const analysisData = await analysisResponse.json();

			setMessage(`${bookData.message} and ${analysisData.message}`);
			router.refresh();
		} catch (error) {
			console.error("Delete chapter error:", error);
			if (error instanceof Error && error.message.includes("timeout")) {
				setMessage("Operation is taking longer than expected. Please check the server logs or try again later.");
			} else {
				setMessage(error instanceof Error ? error.message : "Error occurred while deleting chapter");
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="p-4 max-w-2xl mx-auto">
			<h2 className="text-2xl font-bold mb-4">Delete Entries</h2>

			{/* Selection Controls */}
			<div className="space-y-4 mb-6">
				<div>
					<label className="block mb-2">Select Book:</label>
					<select className="w-full p-2 border rounded" value={selectedBook} onChange={(e) => handleBookChange(e.target.value)}>
						<option value="">Select a book</option>
						{treeData.map((book) => (
							<option key={book.book} value={book.book}>
								{book.book}
							</option>
						))}
					</select>
				</div>

				{selectedBook && currentBook?.part1 && currentBook.part1.length > 0 && (
					<div>
						<label className="block mb-2">Select Part 1 (Optional):</label>
						<select className="w-full p-2 border rounded" value={selectedPart1} onChange={(e) => handlePart1Change(e.target.value)}>
							<option value="">None</option>
							{currentBook.part1
								.filter((p) => p.part !== null)
								.map((p) => (
									<option key={p.part} value={p.part}>
										{p.part}
									</option>
								))}
						</select>
					</div>
				)}

				{selectedPart1 && currentPart1?.part2 && currentPart1.part2.length > 0 && (
					<div>
						<label className="block mb-2">Select Part 2 (Optional):</label>
						<select className="w-full p-2 border rounded" value={selectedPart2} onChange={(e) => handlePart2Change(e.target.value)}>
							<option value="">None</option>
							{currentPart1.part2.map((p) => (
								<option key={p.part} value={p.part}>
									{p.part}
								</option>
							))}
						</select>
					</div>
				)}

				{selectedBook && (
					<div>
						<label className="block mb-2">Select Chapter:</label>
						<select className="w-full p-2 border rounded" value={selectedChapter} onChange={(e) => setSelectedChapter(e.target.value)}>
							<option value="">Select Chapter</option>
							{getChapters()}
						</select>
					</div>
				)}
			</div>

			{/* Action Buttons */}
			<div className="space-y-4">
				<button
					onClick={deleteEntireBook}
					disabled={!selectedBook || loading}
					className="w-full p-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
				>
					Delete Entire Book and Its Analysis
				</button>

				<button
					onClick={deleteChapter}
					disabled={!selectedChapter || loading}
					className="w-full p-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400"
				>
					Delete Selected Chapter and Its Analysis
				</button>
			</div>

			{/* Status Message */}
			{message && <div className="mt-4 p-4 bg-gray-100 rounded">{message}</div>}
		</div>
	);

	function getChapters(): JSX.Element[] {
		if (!selectedBook || !currentBook) return [];

		// Case 1: If part1 is null or not selected, show all chapters
		if (!selectedPart1) {
			if (currentBook.part1 && currentBook.part1.length > 0) {
				// Get chapters from part1 with null part
				const nullPart1 = currentBook.part1.find((p) => p.part === null);
				if (nullPart1 && nullPart1.part2[0]) {
					return nullPart1.part2[0].chapters
						.sort((a, b) => Number(a) - Number(b))
						.map((chapter) => (
							<option key={chapter} value={chapter}>
								Chapter {chapter}
							</option>
						));
				}
			}
			// If no null part1, get all chapters from all parts
			return currentBook.part1
				.flatMap((p1) => p1.part2)
				.flatMap((p2) => p2.chapters)
				.filter((chapter, index, self) => self.indexOf(chapter) === index)
				.sort((a, b) => Number(a) - Number(b))
				.map((chapter) => (
					<option key={chapter} value={chapter}>
						Chapter {chapter}
					</option>
				));
		}

		// Case 2: If part1 is selected but no part2
		if (!selectedPart2 && currentPart1) {
			return currentPart1.part2
				.flatMap((p2) => p2.chapters)
				.filter((chapter, index, self) => self.indexOf(chapter) === index)
				.sort((a, b) => Number(a) - Number(b))
				.map((chapter) => (
					<option key={chapter} value={chapter}>
						Chapter {chapter}
					</option>
				));
		}

		// Case 3: Both part1 and part2 are selected
		if (currentPart2) {
			return currentPart2.chapters
				.sort((a, b) => Number(a) - Number(b))
				.map((chapter) => (
					<option key={chapter} value={chapter}>
						Chapter {chapter}
					</option>
				));
		}

		return [];
	}
}
