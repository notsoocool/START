"use client";

import { useState, useEffect } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
	Loader2,
	Download,
	Database,
	FileText,
	Filter,
	Search,
} from "lucide-react";
import { toast } from "sonner";

interface Book {
	book: string;
	part1: Array<{
		part: string | null;
		part2: Array<{
			part: string | null;
			chapters: string[];
		}>;
	}>;
}

interface AnalysisField {
	id: string;
	label: string;
	description: string;
	selected: boolean;
}

interface ShlokaField {
	id: string;
	label: string;
	description: string;
	selected: boolean;
}

export default function DataDownload() {
	const [books, setBooks] = useState<Book[]>([]);
	const [selectedBook, setSelectedBook] = useState<string>("");
	const [selectedPart1, setSelectedPart1] = useState<string>("");
	const [selectedPart2, setSelectedPart2] = useState<string>("");
	const [selectedChapter, setSelectedChapter] = useState<string>("");
	const [selectedShloka, setSelectedShloka] = useState<string>("all");
	const [dataType, setDataType] = useState<"analysis" | "shloka" | "both">(
		"analysis"
	);
	const [format, setFormat] = useState<"json" | "csv">("json");
	const [isLoading, setIsLoading] = useState(false);
	const [downloadProgress, setDownloadProgress] = useState<number>(0);
	const [downloadStatus, setDownloadStatus] = useState<string>("");
	const [isDownloading, setIsDownloading] = useState(false);
	const [downloadId, setDownloadId] = useState<string>("");
	const [downloadController, setDownloadController] =
		useState<AbortController | null>(null);
	const [availablePart1s, setAvailablePart1s] = useState<string[]>([]);
	const [availablePart2s, setAvailablePart2s] = useState<string[]>([]);
	const [availableChapters, setAvailableChapters] = useState<string[]>([]);
	const [availableShlokas, setAvailableShlokas] = useState<string[]>([]);
	const [searchTerm, setSearchTerm] = useState("");

	// Analysis fields with descriptions
	const [analysisFields, setAnalysisFields] = useState<AnalysisField[]>([
		{
			id: "anvaya_no",
			label: "Anvaya Number",
			description: "Index number for the analysis",
			selected: true,
		},
		{
			id: "word",
			label: "Word",
			description: "Sanskrit word being analyzed",
			selected: true,
		},
		{
			id: "poem",
			label: "Prose Index",
			description: "Position in the prose",
			selected: true,
		},
		{
			id: "sandhied_word",
			label: "Sandhied Word",
			description: "Word after sandhi rules",
			selected: true,
		},
		{
			id: "morph_analysis",
			label: "Morphological Analysis",
			description: "Detailed word analysis",
			selected: true,
		},
		{
			id: "morph_in_context",
			label: "Morph in Context",
			description: "Contextual morphology",
			selected: true,
		},
		{
			id: "kaaraka_sambandha",
			label: "Kaaraka Relations",
			description: "Grammatical relationships",
			selected: true,
		},
		{
			id: "possible_relations",
			label: "Possible Relations",
			description: "Alternative relationships",
			selected: true,
		},
		{
			id: "hindi_meaning",
			label: "Hindi Meaning",
			description: "Translation in Hindi",
			selected: true,
		},
		{
			id: "english_meaning",
			label: "English Meaning",
			description: "Translation in English",
			selected: true,
		},
		{
			id: "bgcolor",
			label: "Background Color",
			description: "Color coding for visualization",
			selected: false,
		},
		{
			id: "sentno",
			label: "Sentence Number",
			description: "Sentence identifier",
			selected: true,
		},
		{
			id: "chaptno",
			label: "Chapter Number",
			description: "Chapter identifier",
			selected: true,
		},
		{
			id: "slokano",
			label: "Shloka Number",
			description: "Shloka identifier",
			selected: true,
		},
		{
			id: "book",
			label: "Book Name",
			description: "Book identifier",
			selected: true,
		},
		{
			id: "part1",
			label: "Part 1",
			description: "First part identifier",
			selected: true,
		},
		{
			id: "part2",
			label: "Part 2",
			description: "Second part identifier",
			selected: true,
		},
	]);

	// Shloka fields with descriptions
	const [shlokaFields, setShlokaFields] = useState<ShlokaField[]>([
		{
			id: "slokano",
			label: "Shloka Number",
			description: "Unique shloka identifier",
			selected: true,
		},
		{
			id: "chaptno",
			label: "Chapter Number",
			description: "Chapter identifier",
			selected: true,
		},
		{
			id: "spart",
			label: "Sub Part",
			description: "Subdivision identifier",
			selected: true,
		},
		{
			id: "userPublished",
			label: "User Published",
			description: "User publication status",
			selected: true,
		},
		{
			id: "groupPublished",
			label: "Group Published",
			description: "Group publication status",
			selected: true,
		},
		{
			id: "locked",
			label: "Locked",
			description: "Lock status",
			selected: true,
		},
		{
			id: "owner",
			label: "Owner",
			description: "Owner identifier",
			selected: true,
		},
		{
			id: "book",
			label: "Book Name",
			description: "Book identifier",
			selected: true,
		},
		{
			id: "part1",
			label: "Part 1",
			description: "First part identifier",
			selected: true,
		},
		{
			id: "part2",
			label: "Part 2",
			description: "Second part identifier",
			selected: true,
		},
	]);

	// Fetch books on component mount
	useEffect(() => {
		fetchBooks();
	}, []);

	// Cleanup downloads on unmount
	useEffect(() => {
		return () => {
			if (downloadController) {
				downloadController.abort();
			}
		};
	}, [downloadController]);

	// Update available options when book selection changes
	useEffect(() => {
		if (selectedBook && selectedBook !== "all") {
			const book = books.find((b) => b.book === selectedBook);
			if (book) {
				const part1s = book.part1
					.map((p) => p.part)
					.map((p) => (p === null ? "none" : p)) as string[];
				setAvailablePart1s(part1s);

				// If part1 only contains null values, disable it and set to "none"
				const hasValidPart1s = part1s.some((part) => part !== "none");
				if (!hasValidPart1s) {
					setSelectedPart1("none");
				} else {
					setSelectedPart1("");
				}

				setSelectedPart2("");
				setSelectedChapter("");
				setSelectedShloka("all");
			}
		} else if (selectedBook === "all") {
			// If "All Books" is selected, clear all subsequent selections
			setAvailablePart1s([]);
			setAvailablePart2s([]);
			setAvailableChapters([]);
			setAvailableShlokas([]);
			setSelectedPart1("");
			setSelectedPart2("");
			setSelectedChapter("");
			setSelectedShloka("all");
		}
	}, [selectedBook, books]);

	// Update available options when part1 changes
	useEffect(() => {
		if (
			selectedBook &&
			selectedPart1 &&
			selectedBook !== "all" &&
			selectedPart1 !== "all"
		) {
			const book = books.find((b) => b.book === selectedBook);
			if (book) {
				const part1 = book.part1.find(
					(p) =>
						p.part ===
						(selectedPart1 === "none" ? null : selectedPart1)
				);
				if (part1) {
					const part2s = part1.part2
						.map((p) => p.part)
						.map((p) => (p === null ? "none" : p)) as string[];
					setAvailablePart2s(part2s);

					// If part2 only contains null values, disable it and set to "none"
					const hasValidPart2s = part2s.some(
						(part) => part !== "none"
					);
					if (!hasValidPart2s) {
						setSelectedPart2("none");
					} else {
						setSelectedPart2("");
					}

					setSelectedChapter("");
					setSelectedShloka("all");
				}
			}
		} else if (selectedPart1 === "all") {
			// If "All Parts" is selected for part1, clear subsequent selections
			setAvailablePart2s([]);
			setAvailableChapters([]);
			setAvailableShlokas([]);
			setSelectedPart2("");
			setSelectedChapter("");
			setSelectedShloka("all");
		}
	}, [selectedBook, selectedPart1, books]);

	// Update available options when part2 changes
	useEffect(() => {
		if (
			selectedBook &&
			selectedPart1 &&
			selectedPart2 &&
			selectedBook !== "all" &&
			selectedPart1 !== "all" &&
			selectedPart2 !== "all"
		) {
			const book = books.find((b) => b.book === selectedBook);
			if (book) {
				const part1 = book.part1.find(
					(p) =>
						p.part ===
						(selectedPart1 === "none" ? null : selectedPart1)
				);
				if (part1) {
					const part2 = part1.part2.find(
						(p) =>
							p.part ===
							(selectedPart2 === "none" ? null : selectedPart2)
					);
					if (part2) {
						setAvailableChapters(part2.chapters);
						setSelectedChapter("");
						setSelectedShloka("all");
					}
				}
			}
		} else if (selectedPart2 === "all") {
			// If "All Parts" is selected for part2, clear subsequent selections
			setAvailableChapters([]);
			setAvailableShlokas([]);
			setSelectedChapter("");
			setSelectedShloka("all");
		}
	}, [selectedBook, selectedPart1, selectedPart2, books]);

	// Update available shlokas when chapter changes
	useEffect(() => {
		if (
			selectedBook &&
			selectedPart1 &&
			selectedPart2 &&
			selectedChapter &&
			selectedBook !== "all" &&
			selectedPart1 !== "all" &&
			selectedPart2 !== "all" &&
			selectedChapter !== "all"
		) {
			fetchShlokas();
		}
	}, [selectedBook, selectedPart1, selectedPart2, selectedChapter]);

	const fetchBooks = async () => {
		try {
			const response = await fetch("/api/books");
			if (!response.ok) throw new Error("Failed to fetch books");
			const data = await response.json();
			setBooks(data);
		} catch (error) {
			console.error("Error fetching books:", error);
			toast.error("Failed to load books");
		}
	};

	const fetchShlokas = async () => {
		try {
			const part1Param =
				selectedPart1 === "none" ? "null" : selectedPart1;
			const part2Param =
				selectedPart2 === "none" ? "null" : selectedPart2;
			const response = await fetch(
				`/api/books/${selectedBook}/${part1Param}/${part2Param}/${selectedChapter}`
			);
			if (!response.ok) throw new Error("Failed to fetch shlokas");
			const data = await response.json();
			const shlokaNumbers = data.shlokas.map((s: any) => s.slokano);
			setAvailableShlokas(shlokaNumbers);
		} catch (error) {
			console.error("Error fetching shlokas:", error);
			toast.error("Failed to load shlokas");
		}
	};

	const handleFieldToggle = (fieldId: string, isAnalysis: boolean) => {
		if (isAnalysis) {
			setAnalysisFields((prev) =>
				prev.map((field) =>
					field.id === fieldId
						? { ...field, selected: !field.selected }
						: field
				)
			);
		} else {
			setShlokaFields((prev) =>
				prev.map((field) =>
					field.id === fieldId
						? { ...field, selected: !field.selected }
						: field
				)
			);
		}
	};

	const handleSelectAll = (isAnalysis: boolean) => {
		if (isAnalysis) {
			setAnalysisFields((prev) =>
				prev.map((field) => ({ ...field, selected: true }))
			);
		} else {
			setShlokaFields((prev) =>
				prev.map((field) => ({ ...field, selected: true }))
			);
		}
	};

	const handleDeselectAll = (isAnalysis: boolean) => {
		if (isAnalysis) {
			setAnalysisFields((prev) =>
				prev.map((field) => ({ ...field, selected: false }))
			);
		} else {
			setShlokaFields((prev) =>
				prev.map((field) => ({ ...field, selected: false }))
			);
		}
	};

	const getSelectedFields = (isAnalysis: boolean) => {
		if (isAnalysis) {
			return analysisFields
				.filter((field) => field.selected)
				.map((field) => field.id);
		} else {
			return shlokaFields
				.filter((field) => field.selected)
				.map((field) => field.id);
		}
	};

	const downloadData = async () => {
		if (!selectedBook) {
			toast.error("Please select a book");
			return;
		}

		// Validate based on selection level
		if (selectedBook !== "all") {
			if (!selectedPart1) {
				toast.error("Please select Part 1 or 'All Parts'");
				return;
			}
			if (selectedPart1 !== "all") {
				if (!selectedPart2) {
					toast.error("Please select Part 2 or 'All Parts'");
					return;
				}
				if (selectedPart2 !== "all") {
					if (!selectedChapter) {
						toast.error("Please select Chapter or 'All Chapters'");
						return;
					}
				}
			}
		}

		// Prevent multiple downloads
		if (isDownloading) {
			toast.error("Download already in progress. Please wait.");
			return;
		}

		setIsDownloading(true);
		setDownloadProgress(0);
		setDownloadStatus("Preparing download...");
		setIsLoading(true);

		try {
			// Generate unique download ID
			const newDownloadId = `download_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`;
			setDownloadId(newDownloadId);

			// Create download parameters
			const params = new URLSearchParams();
			params.append(
				"book",
				selectedBook === "all" ? "all" : selectedBook
			);
			params.append(
				"part1",
				selectedPart1 === "all"
					? "all"
					: selectedPart1 === "none"
					? "null"
					: selectedPart1 || ""
			);
			params.append(
				"part2",
				selectedPart2 === "all"
					? "all"
					: selectedPart2 === "none"
					? "null"
					: selectedPart2 || ""
			);
			params.append(
				"chapter",
				selectedChapter === "all" ? "all" : selectedChapter || ""
			);
			params.append("format", "json");
			params.append("dataType", dataType);
			params.append("downloadId", newDownloadId);

			// Add data type specific parameters
			if (dataType === "analysis" || dataType === "both") {
				const analysisFields = getSelectedFields(true);
				if (analysisFields.length === 0) {
					throw new Error("No analysis fields selected");
				}
				params.append("analysisFields", analysisFields.join(","));

				if (selectedShloka && selectedShloka !== "all") {
					params.append("slokano", selectedShloka);
				}
			}

			if (dataType === "shloka" || dataType === "both") {
				const shlokaFields = getSelectedFields(false);
				if (shlokaFields.length === 0) {
					throw new Error("No shloka fields selected");
				}
				params.append("shlokaFields", shlokaFields.join(","));
			}

			setDownloadStatus("Fetching data...");
			setDownloadProgress(20);

			// First, get the data size estimate
			const sizeResponse = await fetch(
				`/api/download/size?${params.toString()}`
			);
			if (!sizeResponse.ok) {
				const errorData = await sizeResponse.json().catch(() => ({}));
				throw new Error(
					errorData.error || "Failed to get data size estimate"
				);
			}

			const sizeData = await sizeResponse.json();
			const estimatedSize = sizeData.estimatedSize || 0;
			const isLargeFile = estimatedSize > 10 * 1024 * 1024; // 10MB threshold

			setDownloadStatus(
				`Data size: ${(estimatedSize / (1024 * 1024)).toFixed(2)} MB`
			);
			setDownloadProgress(40);

			// Show warning for very large files
			if (estimatedSize > 100 * 1024 * 1024) {
				// 100MB threshold
				const proceed = window.confirm(
					`Warning: This download will be approximately ${(
						estimatedSize /
						(1024 * 1024)
					).toFixed(2)} MB. ` +
						`Large downloads may take a while and could impact system performance. Do you want to continue?`
				);
				if (!proceed) {
					setIsDownloading(false);
					setDownloadProgress(0);
					setDownloadStatus("");
					setDownloadId("");
					return;
				}
			}

			if (isLargeFile) {
				// For large files, use regular download instead of streaming
				// Streaming has been causing issues in production
				setDownloadStatus("Large file detected. Starting download...");
				setDownloadProgress(60);

				await regularDownload(params, newDownloadId);
			} else {
				// For smaller files, use regular download
				setDownloadStatus("Downloading file...");
				setDownloadProgress(80);

				await regularDownload(params, newDownloadId);
			}

			setDownloadProgress(100);
			setDownloadStatus("Download completed!");
			toast.success("Download completed successfully!");
		} catch (error) {
			console.error("Download error:", error);
			setDownloadStatus("Download failed");
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to download data"
			);
		} finally {
			setIsLoading(false);
			// Keep download state for a few seconds to show completion
			setTimeout(() => {
				setIsDownloading(false);
				setDownloadProgress(0);
				setDownloadStatus("");
				setDownloadId("");
			}, 3000);
		}
	};

	const streamDownload = async (
		params: URLSearchParams,
		downloadId: string
	) => {
		const controller = new AbortController();
		setDownloadController(controller);

		try {
			console.log("Starting streaming download...");
			const response = await fetch(
				`/api/download/stream?${params.toString()}`,
				{
					signal: controller.signal,
				}
			);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Streaming download failed:", errorText);
				throw new Error(
					`Streaming download failed: ${response.status}`
				);
			}

			console.log("Got response, starting to read stream...");

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error("No response body");
			}

			const chunks: Uint8Array[] = [];
			let receivedLength = 0;

			// Try to get content length from headers
			const contentLength = response.headers.get("content-length");
			const totalBytes = contentLength
				? parseInt(contentLength, 10)
				: null;

			while (true) {
				const { done, value } = await reader.read();

				if (done) break;

				if (value) {
					chunks.push(value);
					receivedLength += value.length;

					// Update progress with proper bounds
					if (totalBytes) {
						// If we know the total size, use it for accurate progress
						const progress = Math.min(
							100,
							(receivedLength / totalBytes) * 100
						);
						setDownloadProgress(
							Math.max(60, Math.min(99, progress))
						);
					} else {
						// Otherwise, use a simple incremental progress that caps at 98%
						const progress = Math.min(
							98,
							60 + Math.floor(receivedLength / (10 * 1024))
						);
						setDownloadProgress(progress);
					}

					setDownloadStatus(
						`Downloaded: ${(receivedLength / (1024 * 1024)).toFixed(
							2
						)} MB${
							totalBytes
								? ` / ${(totalBytes / (1024 * 1024)).toFixed(
										2
								  )} MB`
								: ""
						}`
					);
				}
			}

			// Set to 100% when complete
			setDownloadProgress(100);
			setDownloadStatus("Processing download...");

			// Combine chunks and create download
			const blob = new Blob(chunks as BlobPart[], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);

			const link = document.createElement("a");
			link.href = url;
			const part1Label =
				selectedPart1 === "none" ? "none" : selectedPart1 || "";
			const part2Label =
				selectedPart2 === "none" ? "none" : selectedPart2 || "";
			const chapterLabel = selectedChapter || "";
			link.download = `data_${selectedBook}_${part1Label}_${part2Label}_${chapterLabel}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			URL.revokeObjectURL(url);
		} finally {
			setDownloadController(null);
		}
	};

	const regularDownload = async (
		params: URLSearchParams,
		downloadId: string
	) => {
		const controller = new AbortController();
		setDownloadController(controller);

		try {
			console.log("Starting regular download...");
			setDownloadStatus("Fetching data from server...");
			setDownloadProgress(70);

			const response = await fetch(`/api/download?${params.toString()}`, {
				signal: controller.signal,
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Download failed:", errorText);
				throw new Error(
					`Download failed: ${response.status} - ${errorText}`
				);
			}

			console.log("Got response, converting to blob...");
			setDownloadProgress(85);
			setDownloadStatus("Processing data...");

			const blob = await response.blob();
			console.log("Blob created, size:", blob.size);

			setDownloadProgress(95);
			setDownloadStatus("Creating download...");

			const url = URL.createObjectURL(blob);

			const link = document.createElement("a");
			link.href = url;
			const part1Label =
				selectedPart1 === "none" ? "none" : selectedPart1 || "";
			const part2Label =
				selectedPart2 === "none" ? "none" : selectedPart2 || "";
			const chapterLabel = selectedChapter || "";
			link.download = `data_${selectedBook}_${part1Label}_${part2Label}_${chapterLabel}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			URL.revokeObjectURL(url);
			console.log("Download completed successfully");
		} finally {
			setDownloadController(null);
		}
	};

	const cancelDownload = () => {
		if (downloadController) {
			downloadController.abort();
			setDownloadController(null);
		}
		setIsDownloading(false);
		setDownloadProgress(0);
		setDownloadStatus("Download cancelled");
		setDownloadId("");
		toast.info("Download cancelled");

		// Reset after a few seconds
		setTimeout(() => {
			setDownloadStatus("");
		}, 3000);
	};

	const filteredBooks = books.filter((book) =>
		book.book.toLowerCase().includes(searchTerm.toLowerCase())
	);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<Database className="h-8 w-8 text-primary" />
				<div>
					<h2 className="text-2xl font-bold">Data Download Center</h2>
					<p className="text-muted-foreground">
						Download analysis and shloka data with custom field
						selection and format options
					</p>
				</div>
			</div>

			{/* Data Selection */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Filter className="h-5 w-5" />
						Data Selection
					</CardTitle>
					<CardDescription>
						Choose the data type, location, and fields you want to
						download
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Data Type Selection */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label>Data Type</Label>
							<Select
								value={dataType}
								onValueChange={(
									value: "analysis" | "shloka" | "both"
								) => setDataType(value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select data type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="analysis">
										Analysis Data Only
									</SelectItem>
									<SelectItem value="shloka">
										Shloka Data Only
									</SelectItem>
									<SelectItem value="both">
										Both Analysis & Shloka
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Output Format</Label>
							<Select
								value={format}
								onValueChange={(value: "json" | "csv") =>
									setFormat(value)
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select format" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="json">JSON</SelectItem>
									<SelectItem value="csv" disabled>
										CSV (Temporarily Disabled)
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Search Books</Label>
							<Input
								placeholder="Search books..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full"
							/>
						</div>
					</div>

					{/* Book Selection */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
						<div className="space-y-2">
							<Label>Book *</Label>
							<Select
								value={selectedBook}
								onValueChange={setSelectedBook}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select book" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Books
									</SelectItem>
									{filteredBooks.map((book) => (
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

						<div className="space-y-2">
							<Label>Part 1 *</Label>
							<Select
								value={selectedPart1}
								onValueChange={setSelectedPart1}
								disabled={
									!selectedBook ||
									selectedBook === "all" ||
									availablePart1s.length === 0
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select part 1" />
								</SelectTrigger>
								<SelectContent>
									{availablePart1s.some(
										(part) => part !== "none"
									) && (
										<SelectItem value="all">
											All Parts
										</SelectItem>
									)}
									{availablePart1s.map((part1) => (
										<SelectItem key={part1} value={part1}>
											{part1 === "none" ? "None" : part1}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Part 2 *</Label>
							<Select
								value={selectedPart2}
								onValueChange={setSelectedPart2}
								disabled={
									!selectedPart1 ||
									selectedPart1 === "all" ||
									availablePart2s.length === 0
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select part 2" />
								</SelectTrigger>
								<SelectContent>
									{availablePart2s.some(
										(part) => part !== "none"
									) && (
										<SelectItem value="all">
											All Parts
										</SelectItem>
									)}
									{availablePart2s.map((part2) => (
										<SelectItem key={part2} value={part2}>
											{part2 === "none" ? "None" : part2}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Chapter *</Label>
							<Select
								value={selectedChapter}
								onValueChange={setSelectedChapter}
								disabled={
									!selectedPart2 ||
									selectedPart2 === "all" ||
									availableChapters.length === 0
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select chapter" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Chapters
									</SelectItem>
									{availableChapters.map((chapter) => (
										<SelectItem
											key={chapter}
											value={chapter}
										>
											{chapter}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Shloka (Optional)</Label>
							<Select
								value={selectedShloka}
								onValueChange={setSelectedShloka}
								disabled={!selectedChapter}
							>
								<SelectTrigger>
									<SelectValue placeholder="All shlokas" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Shlokas
									</SelectItem>
									{availableShlokas.map((shloka) => (
										<SelectItem key={shloka} value={shloka}>
											{shloka}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Field Selection */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Analysis Fields */}
				{(dataType === "analysis" || dataType === "both") && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								<span className="flex items-center gap-2">
									<FileText className="h-5 w-5" />
									Analysis Fields
								</span>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleSelectAll(true)}
									>
										Select All
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleDeselectAll(true)}
									>
										Deselect All
									</Button>
								</div>
							</CardTitle>
							<CardDescription>
								Choose which analysis fields to include in the
								download
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ScrollArea className="h-64">
								<div className="space-y-3">
									{analysisFields.map((field) => (
										<div
											key={field.id}
											className="flex items-start space-x-3"
										>
											<Checkbox
												id={`analysis-${field.id}`}
												checked={field.selected}
												onCheckedChange={() =>
													handleFieldToggle(
														field.id,
														true
													)
												}
											/>
											<div className="flex-1">
												<Label
													htmlFor={`analysis-${field.id}`}
													className="font-medium"
												>
													{field.label}
												</Label>
												<p className="text-sm text-muted-foreground">
													{field.description}
												</p>
											</div>
										</div>
									))}
								</div>
							</ScrollArea>
							<div className="mt-3 pt-3 border-t">
								<Badge variant="secondary">
									{
										analysisFields.filter((f) => f.selected)
											.length
									}{" "}
									of {analysisFields.length} fields selected
								</Badge>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Shloka Fields */}
				{(dataType === "shloka" || dataType === "both") && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								<span className="flex items-center gap-2">
									<Database className="h-5 w-5" />
									Shloka Fields
								</span>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleSelectAll(false)}
									>
										Select All
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleDeselectAll(false)}
									>
										Deselect All
									</Button>
								</div>
							</CardTitle>
							<CardDescription>
								Choose which shloka fields to include in the
								download
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ScrollArea className="h-64">
								<div className="space-y-3">
									{shlokaFields.map((field) => (
										<div
											key={field.id}
											className="flex items-start space-x-3"
										>
											<Checkbox
												id={`shloka-${field.id}`}
												checked={field.selected}
												onCheckedChange={() =>
													handleFieldToggle(
														field.id,
														false
													)
												}
											/>
											<div className="flex-1">
												<Label
													htmlFor={`shloka-${field.id}`}
													className="font-medium"
												>
													{field.label}
												</Label>
												<p className="text-sm text-muted-foreground">
													{field.description}
												</p>
											</div>
										</div>
									))}
								</div>
							</ScrollArea>
							<div className="mt-3 pt-3 border-t">
								<Badge variant="secondary">
									{
										shlokaFields.filter((f) => f.selected)
											.length
									}{" "}
									of {shlokaFields.length} fields selected
								</Badge>
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Download Button */}
			<Card>
				<CardContent className="pt-6">
					<div className="space-y-4">
						{/* Download Progress */}
						{isDownloading && (
							<div className="space-y-3 p-4 bg-muted rounded-lg">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">
										{downloadStatus}
									</span>
									<div className="flex items-center gap-2">
										<span className="text-sm text-muted-foreground">
											{downloadProgress.toFixed(0)}%
										</span>
										<Button
											variant="outline"
											size="sm"
											onClick={cancelDownload}
											className="h-6 px-2 text-xs"
										>
											Cancel
										</Button>
									</div>
								</div>
								<div className="w-full bg-secondary rounded-full h-2">
									<div
										className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
										style={{
											width: `${downloadProgress}%`,
										}}
									/>
								</div>
								{downloadId && (
									<div className="text-xs text-muted-foreground">
										Download ID: {downloadId}
									</div>
								)}
							</div>
						)}

						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h3 className="font-medium">
									Ready to Download
								</h3>
								<p className="text-sm text-muted-foreground">
									{dataType === "analysis" && "Analysis data"}
									{dataType === "shloka" && "Shloka data"}
									{dataType === "both" &&
										"Analysis and shloka data"}{" "}
									in JSON format
									{selectedBook === "all" && " for all books"}
									{selectedBook !== "all" &&
										selectedPart1 === "all" &&
										" for all parts of " + selectedBook}
									{selectedBook !== "all" &&
										selectedPart1 !== "all" &&
										selectedPart2 === "all" &&
										" for all parts of " +
											selectedBook +
											" - " +
											selectedPart1}
									{selectedBook !== "all" &&
										selectedPart1 !== "all" &&
										selectedPart2 !== "all" &&
										selectedChapter === "all" &&
										" for all chapters of " +
											selectedBook +
											" - " +
											selectedPart1 +
											" - " +
											selectedPart2}
									{selectedBook !== "all" &&
										selectedPart1 !== "all" &&
										selectedPart2 !== "all" &&
										selectedChapter !== "all" &&
										" for " +
											selectedBook +
											" - " +
											selectedPart1 +
											" - " +
											selectedPart2 +
											" - " +
											selectedChapter}
								</p>
							</div>
							<Button
								onClick={downloadData}
								disabled={
									isLoading || !selectedBook || isDownloading
								}
								size="lg"
								className="min-w-[200px]"
							>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Preparing Download...
									</>
								) : isDownloading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Downloading...
									</>
								) : (
									<>
										<Download className="mr-2 h-4 w-4" />
										Download Data
									</>
								)}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
