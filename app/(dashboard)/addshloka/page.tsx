"use client";
import React, { useRef, useMemo } from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraphDisplay } from "@/components/global/GraphDisplay";
import { SliderIcon } from "@radix-ui/react-icons";
import axios from "axios";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { colorMapping } from "@/lib/constants";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const jsonToTsv = (data: any[]): string => {
	const tsvRows = data.map(
		(row) =>
			Object.values(row)
				.map((value) => `"${value}"`)
				.join("\t") // Join values with tabs
	);
	const header = Object.keys(data[0]).join("\t"); // Header row (keys)
	return [header, ...tsvRows].join("\n"); // Join header and rows with newline
};

// Add the hexToRgb helper function
const hexToRgb = (hex: string) => {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "0, 0, 0";
};

interface BookData {
	book: string;
	part1: Array<{
		part: string | null;
		part2: Array<{
			part: string | null;
			chapters: string[];
		}>;
	}>;
}

// Move SaveDialog outside the main component and make it a proper component
interface SaveDialogProps {
	showSaveDialog: boolean;
	setShowSaveDialog: (show: boolean) => void;
	selectedBook: string;
	setSelectedBook: (book: string) => void;
	selectedPart1: string;
	setSelectedPart1: (part1: string) => void;
	selectedPart2: string;
	setSelectedPart2: (part2: string) => void;
	chaptno: string;
	setChaptno: (chaptno: string) => void;
	slokano: string;
	setSlokano: (slokano: string) => void;
	isNewBook: boolean;
	setIsNewBook: (isNew: boolean) => void;
	handleSave: () => void;
	existingBooks: string[];
	availablePart1s: string[];
	availablePart2s: string[];
	availableChapters: string[];
	isSaving: boolean;
}

const SaveDialog = ({
	showSaveDialog,
	setShowSaveDialog,
	selectedBook,
	setSelectedBook,
	selectedPart1,
	setSelectedPart1,
	selectedPart2,
	setSelectedPart2,
	chaptno,
	setChaptno,
	slokano,
	setSlokano,
	isNewBook,
	setIsNewBook,
	handleSave,
	existingBooks,
	availablePart1s,
	availablePart2s,
	availableChapters,
	isSaving,
}: SaveDialogProps) => (
	<Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
		<DialogContent className="sm:max-w-[425px]">
			<DialogHeader>
				<DialogTitle>Save Shloka and Analysis</DialogTitle>
			</DialogHeader>
			<div className="grid gap-4 py-4">
				<div className="grid gap-2">
					<Label>Book</Label>
					{!isNewBook ? (
						<>
							<Select onValueChange={setSelectedBook} value={selectedBook}>
								<SelectTrigger>
									<SelectValue placeholder="Select existing book" />
								</SelectTrigger>
								<SelectContent>
									{existingBooks.map((book) => (
										<SelectItem key={book} value={book}>
											{book}
										</SelectItem>
									))}
									<SelectItem value="new">Add New Book</SelectItem>
								</SelectContent>
							</Select>
						</>
					) : (
						<Input placeholder="Enter new book name" value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)} />
					)}
					<Button variant="outline" onClick={() => setIsNewBook(!isNewBook)} className="mt-2">
						{isNewBook ? "Select Existing Book" : "Add New Book"}
					</Button>
				</div>

				{(selectedBook || isNewBook) && (
					<>
						<div className="grid gap-2">
							<Label>Part 1 (Optional)</Label>
							{!isNewBook && availablePart1s.length > 0 ? (
								<Select onValueChange={setSelectedPart1} value={selectedPart1}>
									<SelectTrigger>
										<SelectValue placeholder="Select part 1" />
									</SelectTrigger>
									<SelectContent>
										{availablePart1s.map((part) => (
											<SelectItem key={part} value={part}>
												{part}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : (
								<Input placeholder="Enter part 1 (optional)" value={selectedPart1} onChange={(e) => setSelectedPart1(e.target.value)} />
							)}
						</div>

						<div className="grid gap-2">
							<Label>Part 2 (Optional)</Label>
							{!isNewBook && availablePart2s.length > 0 ? (
								<Select onValueChange={setSelectedPart2} value={selectedPart2}>
									<SelectTrigger>
										<SelectValue placeholder="Select part 2" />
									</SelectTrigger>
									<SelectContent>
										{availablePart2s.map((part) => (
											<SelectItem key={part} value={part}>
												{part}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : (
								<Input placeholder="Enter part 2 (optional)" value={selectedPart2} onChange={(e) => setSelectedPart2(e.target.value)} />
							)}
						</div>

						<div className="grid gap-2">
							<Label>Chapter Number</Label>
							{!isNewBook && availableChapters.length > 0 ? (
								<Select onValueChange={setChaptno} value={chaptno}>
									<SelectTrigger>
										<SelectValue placeholder="Select chapter" />
									</SelectTrigger>
									<SelectContent>
										{availableChapters.map((chapter) => (
											<SelectItem key={chapter} value={chapter}>
												{chapter}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : (
								<Input placeholder="Enter chapter number" value={chaptno} onChange={(e) => setChaptno(e.target.value)} required />
							)}
						</div>

						<div className="grid gap-2">
							<Label>Shloka Number</Label>
							<Input type="text" placeholder="Enter shloka number" value={slokano} onChange={(e) => setSlokano(e.target.value)} required />
						</div>
					</>
				)}
			</div>
			<div className="flex justify-end gap-4">
				<Button variant="outline" onClick={() => setShowSaveDialog(false)} disabled={isSaving}>
					Cancel
				</Button>
				<Button onClick={handleSave} disabled={isSaving}>
					{isSaving ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Saving...
						</>
					) : (
						"Save"
					)}
				</Button>
			</div>
		</DialogContent>
	</Dialog>
);

export default function ShlokaPage() {
	const [shlokaInput, setShlokaInput] = useState<string>("");
	const [shlokaProcessing, setShlokaProcessing] = useState<boolean>(false);
	const [processedShlokas, setProcessedShlokas] = useState<any[]>([]);
	const [analysisData, setAnalysisData] = useState<any[]>([]);
	const [originalAnalysisData, setOriginalAnalysisData] = useState<any[]>([]);
	const [permissions, setPermissions] = useState(null);
	const [graphUrls, setGraphUrls] = useState<{ [key: string]: string }>({});
	const [zoomLevels, setZoomLevels] = useState<{ [key: string]: number }>({});
	const [opacity, setOpacity] = useState(0.5); // Default opacity value
	const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [editedSandhiSplit, setEditedSandhiSplit] = useState<string>(""); // New state for editing
	const [selectedColumns, setSelectedColumns] = useState<string[]>([
		"anvaya_no",
		"word",
		"poem",
		"morph_analysis",
		"morph_in_context",
		"kaaraka_sambandha",
		"possible_relations",
		"hindi_meaning",
	]);
	const [showSandhiEdit, setShowSandhiEdit] = useState(false);
	const [editableSandhiResults, setEditableSandhiResults] = useState<string[]>([]);
	const [originalSandhiResults, setOriginalSandhiResults] = useState<any[]>([]);
	const [analysisProcessing, setAnalysisProcessing] = useState<boolean>(false);
	const [bookData, setBookData] = useState<BookData[]>([]);
	const [selectedBook, setSelectedBook] = useState<string>("");
	const [selectedPart1, setSelectedPart1] = useState<string>("");
	const [selectedPart2, setSelectedPart2] = useState<string>("");
	const [chaptno, setChaptno] = useState<string>("");
	const [slokano, setSlokano] = useState<string>("1"); // Add state for slokano
	const [isNewBook, setIsNewBook] = useState(false);
	const [showSaveDialog, setShowSaveDialog] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const columnOptions = [
		{ id: "anvaya_no", label: "Index" },
		{ id: "word", label: "Word" },
		{ id: "poem", label: "Prose Index" },
		{ id: "sandhied_word", label: "Sandhied Word" },
		{ id: "morph_analysis", label: "Morph Analysis" },
		{ id: "morph_in_context", label: "Morph In Context" },
		{ id: "kaaraka_sambandha", label: "Kaaraka Relation" },
		{ id: "possible_relations", label: "Possible Relations" },
		{ id: "hindi_meaning", label: "Hindi Meaning" },
		{ id: "bgcolor", label: "Color Code" },
	];

	const handleColumnSelect = (column: string) => {
		setSelectedColumns((prevSelected) => (prevSelected.includes(column) ? prevSelected.filter((item) => item !== column) : [...prevSelected, column]));
	};

	const ColumnSelector = () => (
		<div className="flex flex-wrap gap-2 mb-4">
			{columnOptions.map((option) => (
				<Button key={option.id} variant={selectedColumns.includes(option.id) ? "default" : "outline"} onClick={() => handleColumnSelect(option.id)} size="sm">
					{option.label}
				</Button>
			))}
		</div>
	);

	const handleOpacityChange = (value: number[]) => {
		setOpacity(value[0] / 100); // Assuming the slider returns a value between 0 and 100
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setShlokaProcessing(true);

		try {
			// Split shlokas by '#'
			const shlokas = shlokaInput
				.split("#")
				.map((s) => s.trim())
				.filter(Boolean);

			const processedResults = await Promise.all(
				shlokas.map(async (shloka) => {
					// Call sandhi splitter API
					const response = await fetch(
						`https://scl.samsaadhanii.in/cgi-bin/scl/MT/prog/sandhi_splitter/sandhi_splitter.cgi?word=${encodeURIComponent(
							shloka
						)}&encoding=Unicode&outencoding=D&mode=sent&disp_mode=json`
					);

					const data = await response.json();
					return {
						original: shloka,
						split: data.segmentation || [],
					};
				})
			);

			// Store original results
			setOriginalSandhiResults(processedResults);

			// Set editable results as joined strings
			setEditableSandhiResults(processedResults.map((result) => result.split.join(" ")));

			// Show the edit interface
			setShowSandhiEdit(true);
			setShlokaProcessing(false);
			toast.success("Sandhi split completed. Please review the results.");
		} catch (error) {
			console.error("Error processing shlokas:", error);
			toast.error("Error processing shlokas: " + (error as Error).message);
			setShlokaProcessing(false);
		}
	};

	const handleProcessAnalysis = async () => {
		setAnalysisProcessing(true);

		try {
			// Process analysis for each edited sandhi split
			const analysisResults = await Promise.all(
				editableSandhiResults.map(async (splitSentence, shlokaIndex) => {
					console.log("Sending split sentence for analysis:", splitSentence);

					const response = await fetch(
						`https://scl.samsaadhanii.in/cgi-bin/scl/MT/anusaaraka.cgi?encoding=Unicode&out_encoding=Devanagari&splitter=None&parse=FULL&tlang=Hindi&text_type=Sloka&mode=json&text=${encodeURIComponent(
							splitSentence
						)}`
					);

					const responseText = await response.text();

					try {
						const data = JSON.parse(responseText);
						if (data && Array.isArray(data) && data[0] && data[0].sent) {
							return data[0].sent.map((item: any) => ({
								...item,
								sentno: (shlokaIndex + 1).toString(),
							}));
						}
						return [];
					} catch (parseError) {
						console.error("Error parsing analysis response:", parseError);
						return [];
					}
				})
			);

			// Format the analysis data as before
			const formattedAnalysis = analysisResults
				.flat()
				.filter(Boolean)
				.map((item: any) => ({
					...item,
					anvaya_no: item.anvaya_no,
					bgcolor: item.bgcolor || "transparent",
					poem: item.poem || "",
					morph_analysis: item.morph_analysis || "-",
					morph_in_context: item.morph_in_context || "-",
					kaaraka_sambandha: item.kaaraka_sambandha || "-",
					possible_relations: item.possible_relations || "-",
					hindi_meaning: item.hindi_meaning_active || item.hindi_meaning || "-",
					word: item.word || "-",
					sandhied_word: item.sandhied_word || "-",
				}));

			if (formattedAnalysis.length > 0) {
				setAnalysisData(formattedAnalysis);
				setOriginalAnalysisData(formattedAnalysis);
				// Removed setShowSandhiEdit(false) to keep the edit interface visible
				toast.success("Analysis completed successfully!");
			} else {
				toast.error("No analysis data was generated");
			}
		} catch (error) {
			console.error("Error in analysis:", error);
			toast.error("Error in analysis: " + (error as Error).message);
		} finally {
			setAnalysisProcessing(false);
		}
	};

	// Add this useEffect to monitor analysisData changes
	useEffect(() => {
		console.log("Analysis data updated:", analysisData);
	}, [analysisData]);

	const updateAnalysisData = (newData: any[]) => {
		setAnalysisData(newData);
		setOriginalAnalysisData(newData);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number, field: string) => {
		const updatedData = [...analysisData];
		updatedData[index][field] = e.target.value;
		setAnalysisData(updatedData);
	};

	const renderTableContent = () => {
		console.log("Rendering table with data:", analysisData);
		return (
			<TableBody>
				{analysisData.map((processed: any, procIndex: number) => {
					const isHovered = hoveredRowIndex === procIndex;

					return (
						<TableRow
							key={procIndex}
							onMouseEnter={() => setHoveredRowIndex(procIndex)}
							onMouseLeave={() => setHoveredRowIndex(null)}
							style={{
								backgroundColor: processed.bgcolor
									? `rgba(${hexToRgb(processed.bgcolor)}, ${isHovered ? Math.min(opacity + 0.1, 1) : opacity})`
									: "transparent",
							}}
						>
							{selectedColumns.includes("anvaya_no") && (
								<TableCell>
									<Input value={processed.anvaya_no} onChange={(e) => handleInputChange(e, procIndex, "anvaya_no")} />
								</TableCell>
							)}
							{selectedColumns.includes("word") && (
								<TableCell>
									<Input value={processed.word} onChange={(e) => handleInputChange(e, procIndex, "word")} />
								</TableCell>
							)}
							{selectedColumns.includes("poem") && (
								<TableCell>
									<Input value={processed.poem} onChange={(e) => handleInputChange(e, procIndex, "poem")} />
								</TableCell>
							)}
							{selectedColumns.includes("sandhied_word") && (
								<TableCell>
									<Input value={processed.sandhied_word} onChange={(e) => handleInputChange(e, procIndex, "sandhied_word")} />
								</TableCell>
							)}
							{selectedColumns.includes("morph_analysis") && (
								<TableCell>
									<Input value={processed.morph_analysis} onChange={(e) => handleInputChange(e, procIndex, "morph_analysis")} />
								</TableCell>
							)}
							{selectedColumns.includes("morph_in_context") && (
								<TableCell>
									<Input value={processed.morph_in_context} onChange={(e) => handleInputChange(e, procIndex, "morph_in_context")} />
								</TableCell>
							)}
							{selectedColumns.includes("kaaraka_sambandha") && (
								<TableCell>
									<Input value={processed.kaaraka_sambandha} onChange={(e) => handleInputChange(e, procIndex, "kaaraka_sambandha")} />
								</TableCell>
							)}
							{selectedColumns.includes("possible_relations") && (
								<TableCell>
									<Input value={processed.possible_relations} onChange={(e) => handleInputChange(e, procIndex, "possible_relations")} />
								</TableCell>
							)}
							{selectedColumns.includes("hindi_meaning") && (
								<TableCell>
									<Input value={processed.hindi_meaning} onChange={(e) => handleInputChange(e, procIndex, "hindi_meaning")} />
								</TableCell>
							)}
							{permissions !== "User" && <TableCell>{/* Add edit/save buttons here */}</TableCell>}
						</TableRow>
					);
				})}
			</TableBody>
		);
	};

	const handleGenerateGraph = async () => {
		// Show loading toast
		const loadingToast = toast.loading("Generating graphs...");

		try {
			// Select only the fields you want to pass
			const selectedFields = [
				"anvaya_no",
				"word",
				"poem",
				"sandhied_word",
				"morph_analysis",
				"morph_in_context",
				"kaaraka_sambandha",
				"possible_relations",
				"bgcolor",
			];

			// Group data by sentno
			const groupedData: { [key: string]: any[] } = {};

			analysisData.forEach((item: any) => {
				const sentno = item.sentno;

				if (!groupedData[sentno]) {
					groupedData[sentno] = [];
				}

				// Create a new object with only the selected fields
				const filteredItem: any = {};
				selectedFields.forEach((field) => {
					filteredItem[field] = item[field];
				});

				// Update the `anvaya_no` to include the sentence number
				if (filteredItem.anvaya_no && sentno) {
					const parts = filteredItem.anvaya_no.split(".");
					const modifiedAnvayaNo = `S${sentno}.${parts.join(".")}`;
					filteredItem.anvaya_no = modifiedAnvayaNo;
				}

				// Update the `kaaraka_sambandha` to include the sentence number
				if (filteredItem.kaaraka_sambandha && sentno) {
					const kaarakaEntries = filteredItem.kaaraka_sambandha.split(";");

					const modifiedKaaraka = kaarakaEntries.map((entry: { split: (arg0: string) => [any, any] }) => {
						const [relation, sentenceNumber] = entry.split(",");
						if (sentenceNumber) {
							const parts = sentenceNumber.split(".");
							return `${relation},S${sentno}.${parts.join(".")}`;
						}
						return entry;
					});

					filteredItem.kaaraka_sambandha = modifiedKaaraka.join(";");
				}

				groupedData[sentno].push(filteredItem);
			});

			// Clear previous graph URLs and errors
			setGraphUrls({});
			setErrorMessage(null);

			// Generate a graph for each sentno group
			for (const [sentno, dataForSentno] of Object.entries(groupedData)) {
				try {
					const tsv = jsonToTsv(dataForSentno);
					const svgContent = await handleSubmitGraph(tsv);
					setGraphUrls((prevGraphUrls) => ({
						...prevGraphUrls,
						[sentno]: svgContent || "",
					}));
				} catch (error) {
					setErrorMessage(`Error generating graph for sentno: ${sentno}`);
				}
			}

			// Dismiss loading toast and show success
			toast.dismiss(loadingToast);
			toast.success("Graphs generated successfully!");

			// Scroll to graphs section
			setTimeout(() => {
				const graphsSection = document.querySelector("[data-graphs-section]");
				if (graphsSection) {
					graphsSection.scrollIntoView({ behavior: "smooth" });
				}
			}, 100);
		} catch (error) {
			// Dismiss loading toast and show error
			toast.dismiss(loadingToast);
			toast.error("Error generating graphs: " + (error as Error).message);
		}
	};

	const handleSubmitGraph = async (tsvData: string) => {
		const formData = new FormData();
		formData.append("tsv", tsvData);

		try {
			const response = await fetch("https://scl.samsaadhanii.in/cgi-bin/scl/Post-editing/ViewGraph_Sentno.cgi", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error("Error uploading TSV data: " + response.statusText);
			}

			const result = await response.text();
			setErrorMessage(null);

			// Extract image URL from response
			return result;
		} catch (error) {
			setErrorMessage("Error uploading TSV data: " + (error as Error).message);
			return null;
		}
	};

	const svgContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

	useEffect(() => {
		// Iterate over each SVG container and run the script within that container
		Object.keys(graphUrls).forEach((sentno) => {
			const svgContainer = svgContainerRefs.current[sentno] || null;
			if (svgContainer) {
				const scripts = svgContainer.querySelectorAll("script");
				scripts.forEach((script) => {
					const newScript = document.createElement("script");
					newScript.textContent = script.textContent;
					svgContainer.appendChild(newScript); // Execute the script inside the SVG container
				});
			}
		});
	}, [graphUrls]);

	// Add zoom-related constants
	const MIN_ZOOM = 0.5;
	const MAX_ZOOM = 2;
	const DEFAULT_ZOOM = 1;
	const ZOOM_STEP = 0.1;

	// Add zoom-related handlers
	const handleZoomIn = (sentno: string) => {
		setZoomLevels((prev) => ({
			...prev,
			[sentno]: Math.min(MAX_ZOOM, (prev[sentno] || DEFAULT_ZOOM) + ZOOM_STEP),
		}));
	};

	const handleZoomOut = (sentno: string) => {
		setZoomLevels((prev) => ({
			...prev,
			[sentno]: Math.max(MIN_ZOOM, (prev[sentno] || DEFAULT_ZOOM) - ZOOM_STEP),
		}));
	};

	const handleResetZoom = (sentno: string) => {
		setZoomLevels((prev) => ({
			...prev,
			[sentno]: DEFAULT_ZOOM,
		}));
	};

	// Fetch book data when component mounts
	useEffect(() => {
		const fetchBookData = async () => {
			try {
				const response = await fetch("/api/books");
				if (!response.ok) {
					throw new Error("Failed to fetch books");
				}
				const data = await response.json();
				setBookData(data);
			} catch (error) {
				console.error("Error fetching books:", error);
				toast.error("Failed to fetch existing books");
			}
		};
		fetchBookData();
	}, []);

	// Get unique book names from the data
	const existingBooks = useMemo(() => bookData.map((item) => item.book), [bookData]);

	// Get available part1 options for selected book
	const availablePart1s = useMemo(() => {
		const book = bookData.find((b) => b.book === selectedBook);
		return book?.part1.map((p) => p.part).filter((p) => p !== null) || [];
	}, [bookData, selectedBook]);

	// Get available part2 options for selected book and part1
	const availablePart2s = useMemo(() => {
		const book = bookData.find((b) => b.book === selectedBook);
		const part1Data = book?.part1.find((p) => p.part === selectedPart1);
		return part1Data?.part2.map((p) => p.part).filter((p) => p !== null) || [];
	}, [bookData, selectedBook, selectedPart1]);

	// Get available chapters for selected combination
	const availableChapters = useMemo(() => {
		const book = bookData.find((b) => b.book === selectedBook);
		const part1Data = book?.part1.find((p) => p.part === selectedPart1);
		const part2Data = part1Data?.part2.find((p) => p.part === selectedPart2);
		return part2Data?.chapters || [];
	}, [bookData, selectedBook, selectedPart1, selectedPart2]);

	const handleSave = async () => {
		if (!selectedBook || !chaptno || !slokano) {
			toast.error("Please fill in all required fields");
			return;
		}

		if (isSaving) {
			return; // Prevent multiple saves
		}

		// Create loading toast
		const loadingToast = toast.loading("Checking shloka number...");
		setIsSaving(true);

		try {
			// First, check for duplicate shloka number
			const checkResponse = await fetch("/api/ahShloka/check-duplicate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
				body: JSON.stringify({
					book: selectedBook,
					part1: selectedPart1 || null,
					part2: selectedPart2 || null,
					chaptno,
					slokano,
					currentShlokaId: null, // Since this is a new shloka
				}),
			});

			if (!checkResponse.ok) {
				throw new Error("Failed to check shloka number");
			}

			const { exists, message } = await checkResponse.json();
			if (exists) {
				toast.dismiss(loadingToast);
				toast.error(message);
				setIsSaving(false);
				return;
			}

			toast.loading("Saving shloka and analysis...", { id: loadingToast });

			// If no duplicate found, proceed with saving
			// First, save the shloka
			const shlokaData = {
				book: selectedBook,
				part1: selectedPart1 || null,
				part2: selectedPart2 || null,
				chaptno,
				slokano,
				spart: shlokaInput,
			};

			const shlokaResponse = await fetch(`/api/books/${selectedBook}/${selectedPart1 || "null"}/${selectedPart2 || "null"}/${chaptno}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(shlokaData),
			});

			if (!shlokaResponse.ok) throw new Error("Failed to save shloka");
			const shlokaResult = await shlokaResponse.json();

			// Then, save the analysis data
			const formattedAnalysisData = analysisData.map((item) => ({
				book: selectedBook,
				part1: selectedPart1 || null,
				part2: selectedPart2 || null,
				chaptno,
				slokano,
				sentno: item.sentno || "1",
				bgcolor: item.bgcolor || "transparent",
				graph: item.graph || "-",
				anvaya_no: item.anvaya_no || "-",
				word: item.word || "-",
				poem: item.poem || "-",
				sandhied_word: item.sandhied_word || "-",
				morph_analysis: item.morph_analysis || "-",
				morph_in_context: item.morph_in_context || "-",
				kaaraka_sambandha: item.kaaraka_sambandha || "-",
				possible_relations: item.possible_relations || "-",
				hindi_meaning: item.hindi_meaning || "-",
				english_meaning: "-",
				samAsa: "-",
				praayoga: "-",
				sarvanAma: "-",
				name_classification: "-",
			}));

			const analysisResponse = await fetch("/api/analysis", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formattedAnalysisData),
			});

			if (!analysisResponse.ok) {
				throw new Error("Failed to save analysis");
			}

			// Update success toast
			toast.success("Successfully saved shloka and analysis", {
				id: loadingToast,
			});
			setShowSaveDialog(false);
		} catch (error) {
			console.error("Error saving data:", error);
			// Update error toast
			toast.error("Failed to save data: " + (error as Error).message, {
				id: loadingToast,
			});
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="container mx-auto p-6 space-y-8">
			<Card>
				<CardHeader>
					<CardTitle>Add Shlokas</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block mb-2">Enter Shlokas (separate multiple shlokas with #):</label>
							<Input
								value={shlokaInput}
								onChange={(e) => setShlokaInput(e.target.value)}
								placeholder="Enter shlokas separated by #"
								className="h-24"
								multiple
							/>
						</div>
						<Button type="submit" disabled={shlokaProcessing}>
							{shlokaProcessing ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Processing...
								</>
							) : (
								"Process Shlokas"
							)}
						</Button>
					</form>
				</CardContent>
			</Card>

			{/* Display processed shlokas */}
			{processedShlokas.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Processed Shlokas</CardTitle>
					</CardHeader>
					<CardContent>
						{processedShlokas.map((result, index) => (
							<div key={index} className="mb-4">
								<h3 className="font-semibold">Original Shloka {index + 1}:</h3>
								<p>{result.original}</p>
								<h4 className="mt-2">Split Result:</h4>
								<p>{result.split.join(" ")}</p>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{/* Sandhi Split Review Section - Always visible after initial processing */}
			{showSandhiEdit && (
				<Card>
					<CardHeader>
						<CardTitle>Review Sandhi Split Results</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="flex justify-end space-x-4 mb-4">
								<Button
									variant="outline"
									onClick={() => {
										setEditableSandhiResults(originalSandhiResults.map((result) => result.split.join(" ")));
									}}
								>
									Reset to Original
								</Button>
								<Button onClick={handleProcessAnalysis} disabled={analysisProcessing}>
									{analysisProcessing ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Processing...
										</>
									) : (
										"Process Analysis"
									)}
								</Button>
							</div>
							{editableSandhiResults.map((result, index) => (
								<div key={index} className="space-y-2">
									<label className="block text-sm font-medium">Shloka {index + 1} Split Result</label>
									<Input
										value={result}
										onChange={(e) => {
											const newResults = [...editableSandhiResults];
											newResults[index] = e.target.value;
											setEditableSandhiResults(newResults);
										}}
									/>
									<div className="text-sm text-muted-foreground">Original: {originalSandhiResults[index]?.split.join(" ")}</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Analysis Results Section */}
			{analysisData.length > 0 && (
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle>Analysis Results</CardTitle>
						<div className="flex items-center gap-4">
							{/* Opacity Slider */}
							<Popover>
								<PopoverTrigger asChild>
									<Button variant="outline" size="sm">
										<SliderIcon className="mr-2 h-4 w-4" />
										Set Opacity
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-80">
									<div className="space-y-2">
										<h4 className="font-medium leading-none">Background Opacity</h4>
										<p className="text-sm text-muted-foreground">Adjust the opacity of color highlighting</p>
										<Slider
											defaultValue={[opacity * 100]}
											max={100}
											step={1}
											className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
											onValueChange={handleOpacityChange}
										/>
									</div>
								</PopoverContent>
							</Popover>

							{/* Column Selector */}
							<Popover>
								<PopoverTrigger asChild>
									<Button variant="outline" size="sm">
										Select Columns
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-80">
									<div className="space-y-2">
										<h4 className="font-medium leading-none mb-3">Visible Columns</h4>
										<div className="grid grid-cols-2 gap-2">
											{columnOptions.map((option) => (
												<Button
													key={option.id}
													variant={selectedColumns.includes(option.id) ? "default" : "outline"}
													onClick={() => handleColumnSelect(option.id)}
													size="sm"
												>
													{option.label}
												</Button>
											))}
										</div>
									</div>
								</PopoverContent>
							</Popover>

							{/* Generate Graph Button */}
							<Button onClick={handleGenerateGraph} size="sm" disabled={analysisData.length === 0}>
								Generate Graph
							</Button>

							<Button onClick={() => setShowSaveDialog(true)} size="sm">
								Save
							</Button>
						</div>
					</CardHeader>

					<CardContent>
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										{selectedColumns.includes("anvaya_no") && <TableHead>Index</TableHead>}
										{selectedColumns.includes("word") && <TableHead>Word</TableHead>}
										{selectedColumns.includes("poem") && <TableHead>Prose Index</TableHead>}
										{selectedColumns.includes("sandhied_word") && <TableHead>Sandhied Word</TableHead>}
										{selectedColumns.includes("morph_analysis") && <TableHead>Morph Analysis</TableHead>}
										{selectedColumns.includes("morph_in_context") && <TableHead>Morph In Context</TableHead>}
										{selectedColumns.includes("kaaraka_sambandha") && <TableHead>Kaaraka Relation</TableHead>}
										{selectedColumns.includes("possible_relations") && <TableHead>Possible Relations</TableHead>}
										{selectedColumns.includes("hindi_meaning") && <TableHead>Hindi Meaning</TableHead>}
										{permissions !== "User" && <TableHead>Actions</TableHead>}
									</TableRow>
								</TableHeader>
								{renderTableContent()}
							</Table>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Graph Display Section */}
			{Object.keys(graphUrls).length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Generated Graphs</CardTitle>
					</CardHeader>
					<CardContent>
						<GraphDisplay
							graphUrls={graphUrls}
							zoomLevels={zoomLevels}
							handleZoomIn={handleZoomIn}
							handleZoomOut={handleZoomOut}
							handleResetZoom={handleResetZoom}
							MIN_ZOOM={MIN_ZOOM}
							MAX_ZOOM={MAX_ZOOM}
							DEFAULT_ZOOM={DEFAULT_ZOOM}
						/>
					</CardContent>
				</Card>
			)}

			<SaveDialog
				showSaveDialog={showSaveDialog}
				setShowSaveDialog={setShowSaveDialog}
				selectedBook={selectedBook}
				setSelectedBook={setSelectedBook}
				selectedPart1={selectedPart1}
				setSelectedPart1={setSelectedPart1}
				selectedPart2={selectedPart2}
				setSelectedPart2={setSelectedPart2}
				chaptno={chaptno}
				setChaptno={setChaptno}
				slokano={slokano}
				setSlokano={setSlokano}
				isNewBook={isNewBook}
				setIsNewBook={setIsNewBook}
				handleSave={handleSave}
				existingBooks={existingBooks}
				availablePart1s={availablePart1s}
				availablePart2s={availablePart2s}
				availableChapters={availableChapters}
				isSaving={isSaving}
			/>
		</div>
	);
}
