"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, PencilIcon, PlusCircleIcon, MinusIcon, PlusIcon } from "lucide-react";
import { ExclamationTriangleIcon, SliderIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { colors } from "@/lib/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { Share2Icon } from "@radix-ui/react-icons";
import { Separator } from "@/components/ui/separator";

declare global {
	interface Window {
		toggleChildren?: (event: MouseEvent) => void;
	}
}

// Update the shloka type definition
type Shloka = {
	_id: any;
	chaptno: string;
	slokano: string;
	spart: string;
};

export default function AnalysisPage() {
	const { book, part1, part2, chaptno, id } = useParams(); // Get the shloka ID from the URL
	const [shloka, setShloka] = useState<Shloka | null>(null);
	const [loading, setLoading] = useState(true);
	const [chapter, setChapter] = useState<any>(null);
	const [initialLoad, setInitialLoad] = useState(true);
	const [opacity, setOpacity] = useState(0.5); // Default opacity value
	const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
	const [updatedData, setUpdatedData] = useState<any[]>([]);
	const [changedRows, setChangedRows] = useState<Set<number>>(new Set()); // Track which rows have changed
	const [, setErrorMessage] = useState<string | null>(null);
	const [graphUrls, setGraphUrls] = useState<{ [sentno: string]: string }>({});
	const [rowMeanings, setRowMeanings] = useState<{ [key: number]: string }>({}); // Store meanings per row
	const [selectedMeaning, setSelectedMeaning] = useState<{ [key: number]: string }>({});
	const [allMeanings, setAllMeanings] = useState<any[]>([]); // Holds all the meanings from API response
	const [selectedDictIndex, setSelectedDictIndex] = useState<number>(0); // Default to the first dictionary
	const [originalData, setOriginalData] = useState<any[]>([]);
	const [permissions, setPermissions] = useState(null);
	const columnOptions = [
		{ id: "index", label: "Index" },
		{ id: "word", label: "Word" },
		{ id: "morph_analysis", label: "Morph Analysis" },
		{ id: "morph_in_context", label: "Morph In Context" },
		{ id: "kaaraka_sambandha", label: "Kaaraka Relation" },
		{ id: "possible_relations", label: "Possible Relations" },
		{ id: "hindi_meaning", label: "Hindi Meaning" },
		{ id: "bgcolor", label: "Color Code" },
	];
	const [zoomLevels, setZoomLevels] = useState<{ [key: string]: number }>({});
	const DEFAULT_ZOOM = 1;
	const MIN_ZOOM = 0.5;
	const MAX_ZOOM = 2;
	const ZOOM_STEP = 0.1;

	useEffect(() => {
		if (!id) return;

		const fetchShlokaData = async () => {
			try {
				setLoading(true);
				const response = await fetch(`/api/ahShloka/${id}`);
				const shlokaData = await response.json();
				setShloka(shlokaData);

				const chapterResponse = await fetch(`/api/analysis/${book}/${part1}/${part2}/${chaptno}/${shlokaData.slokano}`);
				const chapterData = await chapterResponse.json();
				setChapter(chapterData);
				setUpdatedData(chapterData.map((item: any) => ({ ...item })));
				setOriginalData(chapterData.map((item: any) => ({ ...item }))); // Save the original data
			} catch (error) {
				console.error("Error fetching shloka or chapter:", error);
			} finally {
				setInitialLoad(false);
			}
		};
		fetchShlokaData();
	}, [id]);

	const handleOpacityChange = (value: number[]) => {
		setOpacity(value[0] / 100); // Convert slider value to opacity
	};

	const handleValueChange = (procIndex: number, field: string, value: string) => {
		// Update the updatedData state
		setUpdatedData((prevData) => {
			const newData = [...prevData];
			newData[procIndex] = {
				...newData[procIndex],
				[field]: value,
			};
			return newData;
		});

		// Mark the row as changed
		setChangedRows((prev) => new Set(prev.add(procIndex)));
	};

	const handleSave = async (procIndex: number) => {
		const currentData = updatedData[procIndex];
		const originalRowData = originalData[procIndex];

		// Prepare the data to send in the update request
		const updateData: any = {
			// Always include morph_analysis in the update
			morph_analysis: currentData.morph_analysis,
			possible_relations: currentData.possible_relations,
		};

		// Check other fields for changes
		if (currentData.kaaraka_sambandha !== originalRowData?.kaaraka_sambandha) {
			updateData.kaaraka_sambandha = currentData.kaaraka_sambandha;
		}
		if (currentData.morph_in_context !== originalRowData?.morph_in_context) {
			updateData.morph_in_context = currentData.morph_in_context;
		}
		if (currentData.bgcolor !== originalRowData?.bgcolor) {
			updateData.bgcolor = currentData.bgcolor;
		}

		try {
			const response = await fetch(`/api/analysis/${book}/${part1}/${part2}/${chaptno}/${currentData.slokano}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					anvaya_no: currentData.anvaya_no,
					sentno: currentData.sentno,
					...updateData,
				}),
			});

			const result = await response.json();

			if (response.ok) {
				toast.success("Update successful:", result);

				// Update all relevant states
				setUpdatedData((prevData) => {
					const newData = [...prevData];
					newData[procIndex] = {
						...newData[procIndex],
						...updateData,
					};
					return newData;
				});

				setOriginalData((prevData) => {
					const newData = [...prevData];
					newData[procIndex] = {
						...newData[procIndex],
						...updateData,
					};
					return newData;
				});

				// Update the chapter state as well
				setChapter((prevChapter: any[]) => {
					const newChapter = [...prevChapter];
					newChapter[procIndex] = {
						...newChapter[procIndex],
						...updateData,
					};
					return newChapter;
				});

				// Clear the changed state for this row
				setChangedRows((prev) => {
					const newRows = new Set(prev);
					newRows.delete(procIndex);
					return newRows;
				});
			} else {
				toast.error("Error updating data:", result);
			}
		} catch (error) {
			toast.error("Error updating data: " + (error as Error).message);
		}
	};

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

	const handleGenerateGraph = async () => {
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

		chapter.forEach((item: any, index: number) => {
			const updatedItem = updatedData[index] || {};
			const sentno = updatedItem.sentno ?? item.sentno;

			if (!groupedData[sentno]) {
				groupedData[sentno] = [];
			}

			// Create a new object with only the selected fields
			const filteredItem: any = {};
			selectedFields.forEach((field) => {
				filteredItem[field] = updatedItem[field] ?? item[field];
			});

			// ** Update the `anvaya_no` to include the sentence number **
			if (filteredItem.anvaya_no && sentno) {
				const parts = filteredItem.anvaya_no.split(".");
				const modifiedAnvayaNo = `S${sentno}.${parts.join(".")}`;
				filteredItem.anvaya_no = modifiedAnvayaNo;
			}

			// ** Update the `kaaraka_sambandha` to include the sentence number **
			if (filteredItem.kaaraka_sambandha && sentno) {
				const kaarakaEntries = filteredItem.kaaraka_sambandha.split(";");

				const modifiedKaaraka = kaarakaEntries.map((entry: { split: (arg0: string) => [any, any] }) => {
					const [relation, sentenceNumber] = entry.split(",");
					// Check if there is a sentence number part (e.g., "1.2")
					if (sentenceNumber) {
						return `${relation},S${sentno}.${sentenceNumber}`;
					}
					return entry; // Return unchanged if no sentence number is found
				});

				filteredItem.kaaraka_sambandha = modifiedKaaraka.join(";");
			}

			groupedData[sentno].push(filteredItem);
		});

		// Clear previous graph URLs and errors before starting
		setGraphUrls({});
		setErrorMessage(null);

		// Generate a graph for each sentno group
		for (const [sentno, dataForSentno] of Object.entries(groupedData)) {
			try {
				// Convert the filtered data to TSV format
				const tsv = jsonToTsv(dataForSentno);

				const svgContent = await handleSubmitGraph(tsv);

				setGraphUrls((prevGraphUrls) => ({
					...prevGraphUrls,
					[sentno]: svgContent || "", // Store SVG content directly
				}));
			} catch (error) {
				// If any error occurs, show the error message
				setErrorMessage(`Error generating graph for sentno: ${sentno}`);
			}
		}

		// Add this toast notification and scroll to graphs
		toast.success("Graphs generated successfully!");
		
		// Add a small delay to ensure the graphs are rendered
		setTimeout(() => {
			const graphsSection = document.querySelector('[data-graphs-section]');
			if (graphsSection) {
				graphsSection.scrollIntoView({ behavior: 'smooth' });
			}
		}, 100);
	};

	const handleSubmitGraph = async (tsvData: string) => {
		const formData = new FormData();
		formData.append("tsv", tsvData);

		try {
			const response = await fetch("https://sanskrit.uohyd.ac.in/cgi-bin/scl/Post-editing/ViewGraph_Sentno.cgi", {
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
	}, [graphUrls]); // Re-run the effect when graphUrls change

	// Handle node toggling directly inside the SVG
	const [selectedColumns, setSelectedColumns] = useState<string[]>([
		"index",
		"word",
		"morph_analysis",
		"morph_in_context",
		"kaaraka_sambandha",
		"possible_relations",
	]);

	// Toggle column visibility
	const handleColumnSelect = (column: string) => {
		setSelectedColumns((prevSelected) => (prevSelected.includes(column) ? prevSelected.filter((item) => item !== column) : [...prevSelected, column]));
	};

	const extractWord = (morphInContext: string) => {
		const bracketIndex = morphInContext.indexOf("{");
		return bracketIndex === -1 ? morphInContext : morphInContext.slice(0, bracketIndex).trim();
	};

	const fetchMeaning = async (word: string, procIndex: number) => {
		try {
			const response = await fetch(`https://sanskrit.uohyd.ac.in/cgi-bin/scl/MT/dict_help_json.cgi?word=${word}`);
			const jsonData = await response.json();

			if (jsonData && jsonData.length > 0) {
				setAllMeanings(jsonData); // Store all meanings
				// Update selected meaning based on the selected dictionary index
				setSelectedMeaning((prevSelected) => ({
					...prevSelected,
					[procIndex]: jsonData[selectedDictIndex]?.Meaning || "Meaning not found", // Use the selected dictionary index
				}));
			} else {
				setSelectedMeaning((prevSelected) => ({
					...prevSelected,
					[procIndex]: "Meaning not found",
				}));
			}
		} catch (error) {
			console.error("Error fetching meaning:", error);
			setSelectedMeaning((prevSelected) => ({
				...prevSelected,
				[procIndex]: "Error fetching meaning",
			}));
		}
	};
	useEffect(() => {
		const fetchPermissions = async () => {
			setLoading(true); // Start loading when fetching permissions
			try {
				const response = await fetch("/api/getCurrentUser");
				if (!response.ok) {
					throw new Error("User not authenticated");
				}
				const data = await response.json();
				setPermissions(data.perms);
			} catch (error) {
				console.error("Error fetching permissions:", error);
				setPermissions(null);
			} finally {
				setLoading(false); // Stop loading when permissions are fetched
			}
		};

		fetchPermissions();
	}, []);

	const renderColumnsBasedOnPermissions = (processed: any, procIndex: any, currentProcessedData: any, isHovered: any, lookupWord: any) => {
		if (!permissions) {
			return <TableCell></TableCell>;
		}

		const renderMorphInContext = () => (
			<TableCell>
				<Select value={currentProcessedData?.morph_in_context} onValueChange={(value) => handleValueChange(procIndex, "morph_in_context", value)}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder={processed.morph_analysis} />
					</SelectTrigger>
					<SelectContent>
						{processed.morph_analysis.split("/").map((morph: any, index: any) => (
							<SelectItem key={index} value={morph.trim()}>
								{morph.trim()}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</TableCell>
		);

		const renderMorphInContextTEXT = () => {
			// Check if the current value is different from the original
			const isChanged = currentProcessedData?.morph_in_context !== processed.morph_in_context;

			const handleAddToMorphAnalysis = () => {
				const currentValue = currentProcessedData?.morph_in_context?.trim() || "";
				if (!currentValue) return;

				console.log("Current Value:", currentValue);
				console.log("Current morph_analysis:", processed.morph_analysis);

				// Update both updatedData and originalData
				setUpdatedData((prevData) => {
					const newData = [...prevData];
					const existingAnalysis = newData[procIndex].morph_analysis || "";

					// Create the updated morph_analysis string
					const updatedMorphAnalysis = existingAnalysis ? `${existingAnalysis}/${currentValue}` : currentValue;

					console.log("Updated morph_analysis:", updatedMorphAnalysis);

					newData[procIndex] = {
						...newData[procIndex],
						morph_analysis: updatedMorphAnalysis,
					};
					return newData;
				});

				// Also update originalData to reflect the change
				setOriginalData((prevData) => {
					const newData = [...prevData];
					const existingAnalysis = newData[procIndex].morph_analysis || "";

					const updatedMorphAnalysis = existingAnalysis ? `${existingAnalysis}/${currentValue}` : currentValue;

					newData[procIndex] = {
						...newData[procIndex],
						morph_analysis: updatedMorphAnalysis,
					};
					return newData;
				});

				// Mark the row as changed
				setChangedRows((prev) => new Set(prev.add(procIndex)));
			};

			return (
				<TableCell>
					<div className="flex items-center gap-2">
						<Input
							type="text"
							value={currentProcessedData?.morph_in_context || ""}
							onChange={(e) => handleValueChange(procIndex, "morph_in_context", e.target.value)}
							className="w-[180px]"
							placeholder="Enter Morph in Context"
						/>
						{isChanged && (
							<Button variant="outline" className="bg-green-500 hover:bg-green-600" onClick={handleAddToMorphAnalysis}>
								<PlusCircleIcon className="size-4 text-white" />
							</Button>
						)}
					</div>
				</TableCell>
			);
		};

		const renderKaarakaSambandha = () => {
			// Check if the current value is different from the original
			const isChanged = currentProcessedData?.kaaraka_sambandha !== processed.kaaraka_sambandha;

			const handleAddToKaarakaSambandha = () => {
				const currentValue = currentProcessedData?.kaaraka_sambandha?.trim() || "";
				if (!currentValue) return;

				// Update both updatedData and originalData
				setUpdatedData((prevData) => {
					const newData = [...prevData];
					const existingKaaraka = newData[procIndex].possible_relations || "";

					// Create the updated possible_relations string
					const updatedKaaraka = existingKaaraka ? `${existingKaaraka}#${currentValue}` : currentValue;

					newData[procIndex] = {
						...newData[procIndex],
						possible_relations: updatedKaaraka,
					};
					return newData;
				});

				// Also update originalData to reflect the change
				setOriginalData((prevData) => {
					const newData = [...prevData];
					const existingKaaraka = newData[procIndex].possible_relations || "";

					const updatedKaaraka = existingKaaraka ? `${existingKaaraka}#${currentValue}` : currentValue;

					newData[procIndex] = {
						...newData[procIndex],
						possible_relations: updatedKaaraka,
					};
					return newData;
				});

				// Mark the row as changed
				setChangedRows((prev) => new Set(prev.add(procIndex)));
			};

			return (
				<TableCell>
					<div className="flex items-center gap-2">
						<Input
							type="text"
							value={currentProcessedData?.kaaraka_sambandha || ""}
							onChange={(e) => handleValueChange(procIndex, "kaaraka_sambandha", e.target.value)}
							className="w-[180px]"
							placeholder="Enter Kaaraka Sambandha"
						/>
						{isChanged && (
							<Button variant="outline" className="bg-green-500 hover:bg-green-600" onClick={handleAddToKaarakaSambandha}>
								<PlusCircleIcon className="size-4 text-white" />
							</Button>
						)}
					</div>
				</TableCell>
			);
		};

		const renderWord = () => (
			<TableCell>
				<Input
					type="text"
					value={currentProcessedData?.word || ""}
					onChange={(e) => handleValueChange(procIndex, "word", e.target.value)}
					className="w-[100px]"
					placeholder="Enter Word"
				/>
			</TableCell>
		);

		const renderBgColor = () => (
			<TableCell>
				<Select value={currentProcessedData?.bgcolor || ""} onValueChange={(value) => handleValueChange(procIndex, "bgcolor", value)}>
					<SelectTrigger className="w-[180px]">
						<span
							style={{
								backgroundColor: currentProcessedData?.bgcolor || "transparent",
								display: "inline-block",
								width: "20px",
								height: "20px",
								marginRight: "8px",
								borderRadius: "3px", // Optional: Add border radius for better appearance
							}}
						></span>
						{Object.entries(colors).find(([key, value]) => value === currentProcessedData?.bgcolor)?.[0] || "Select Color"}
					</SelectTrigger>
					<SelectContent>
						{Object.entries(colors).map(([key, color]) => (
							<SelectItem key={key} value={color}>
								<span
									style={{
										backgroundColor: color,
										display: "inline-block",
										width: "20px",
										height: "20px",
										marginRight: "8px",
									}}
								></span>
								{key}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</TableCell>
		);

		if (permissions !== "Admin" && permissions !== "Root") {
			return (
				<>
					{selectedColumns.includes("index") && <TableCell>{processed.anvaya_no}</TableCell>}
					{selectedColumns.includes("word") && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<TableCell>
										<span>{processed.word}</span>
									</TableCell>
								</TooltipTrigger>
								{isHovered && selectedMeaning[procIndex] && <TooltipContent>{formatMeaning(selectedMeaning[procIndex])}</TooltipContent>}
							</Tooltip>
						</TooltipProvider>
					)}
					{selectedColumns.includes("morph_analysis") && <TableCell>{processed.morph_analysis}</TableCell>}
					{selectedColumns.includes("morph_in_context") && <TableCell>{processed.morph_in_context}</TableCell>}
					{selectedColumns.includes("kaaraka_sambandha") && <TableCell>{processed.kaaraka_sambandha}</TableCell>}
					{selectedColumns.includes("possible_relations") && <TableCell>{processed.possible_relations}</TableCell>}
					{selectedColumns.includes("hindi_meaning") && <TableCell>{processed.hindi_meaning}</TableCell>}
					{selectedColumns.includes("bgcolor") && <TableCell>{processed.bgcolor}</TableCell>}
				</>
			);
		} else {
			return (
				<>
					{selectedColumns.includes("index") && <TableCell>{processed.anvaya_no}</TableCell>}
					{selectedColumns.includes("word") && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<TableCell>{renderWord()}</TableCell>
								</TooltipTrigger>
								{isHovered && selectedMeaning[procIndex] && <TooltipContent>{formatMeaning(selectedMeaning[procIndex])}</TooltipContent>}
							</Tooltip>
						</TooltipProvider>
					)}
					{selectedColumns.includes("morph_analysis") && <TableCell>{currentProcessedData?.morph_analysis || processed.morph_analysis}</TableCell>}
					{selectedColumns.includes("morph_in_context") && renderMorphInContextTEXT()}
					{selectedColumns.includes("kaaraka_sambandha") && renderKaarakaSambandha()}
					{selectedColumns.includes("possible_relations") && <TableCell>{currentProcessedData?.possible_relations || processed.possible_relations}</TableCell>}
					{selectedColumns.includes("hindi_meaning") && <TableCell>{processed.hindi_meaning}</TableCell>}
					{selectedColumns.includes("bgcolor") && renderBgColor()}
					<TableCell>
						{changedRows.has(procIndex) && (
							<Button onClick={() => handleSave(procIndex)} className="w-full">
								Save
							</Button>
						)}
					</TableCell>
				</>
			);
		}
	};

	const formatMeaning = (meaning: string) => {
		// Split the meaning text based on numbers (e.g., 1., 2., etc.)
		const parts = meaning.split(/(?=\d+\.)/); // This splits the string while keeping the number
		return parts.map((part, index) => (
			<p key={index}>{part.trim()}</p> // Each part is rendered as a new paragraph
		));
	};

	const renderTableContent = () => (
		<TableBody>
			{chapter?.map((processed: any, procIndex: number) => {
				const currentProcessedData = updatedData[procIndex];
				const isHovered = hoveredRowIndex === procIndex;
				const lookupWord = extractWord(processed.morph_in_context);

				return (
					<TableRow
						key={procIndex}
						onMouseEnter={() => {
							setHoveredRowIndex(procIndex);
							if (lookupWord) fetchMeaning(lookupWord, procIndex);
						}}
						onMouseLeave={() => setHoveredRowIndex(null)}
						style={{
							backgroundColor: processed.bgcolor ? `rgba(${hexToRgb(processed.bgcolor)}, ${opacity})` : "transparent",
						}}
					>
						{renderColumnsBasedOnPermissions(processed, procIndex, currentProcessedData, isHovered, lookupWord)}
					</TableRow>
				);
			})}
		</TableBody>
	);

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

	if (initialLoad) {
		return (
			<div className="max-w-screen-2xl mx-auto w-full p-8">
				<Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col justify-between duration-300">
					<CardHeader className="border-b border-primary-100">
						<Skeleton className="h-6 w-40" />
					</CardHeader>
					<CardContent>
						<div className="h-[300px] w-full flex items-center justify-center">
							<Loader2 className="size-6 text-slate-300 animate-spin" />
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}
	// Render loading state
	if (loading) {
		return (
			<div className="max-w-screen-2xl mx-auto w-full p-8">
				<Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col justify-between duration-300">
					<CardHeader className="border-b border-primary-100">
						<Skeleton className="h-6 w-40" />
					</CardHeader>
					<CardContent>
						<div className="h-[300px] w-full flex items-center justify-center">
							<Loader2 className="size-6 text-slate-300 animate-spin" />
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Then check for missing data
	if (!shloka || !chapter) {
		return (
			<div className="max-w-screen-2xl mx-auto w-full">
				<Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col justify-between duration-300">
					<CardHeader className="border-b border-primary-100">
						<CardTitle>Shloka not found</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-[300px] w-full flex items-center justify-center">
							<p className="text-lg text-slate-300 flex items-center">
								<ExclamationTriangleIcon className="w-6 h-6 mr-2" />
								The shloka you are looking for does not exist.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Render the UI with the Shloka
	return (
		<div className="container mx-auto p-6 space-y-8">
			{/* Header Section */}
			<div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center">
				<div className="space-y-2">
					<h1 className="text-2xl font-bold tracking-tight">Analysis Dashboard</h1>
					<p className="text-muted-foreground">
						Chapter {chaptno} - Shloka {shloka?.slokano}
					</p>
				</div>

				{/* Controls Section */}
				<div className="flex flex-col sm:flex-row gap-4">
					{/* Column Selector */}
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" className="w-[200px] justify-start">
								<SliderIcon className="mr-2 h-4 w-4" />
								Customize Columns
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[200px] p-4">
							<div className="space-y-4">
								<h4 className="font-medium leading-none">Toggle Columns</h4>
								<div className="space-y-2">
									{columnOptions.map((column) => (
										<div key={column.id} className="flex items-center space-x-2">
											<Checkbox id={column.id} checked={selectedColumns.includes(column.id)} onCheckedChange={() => handleColumnSelect(column.id)} />
											<Label htmlFor={column.id}>{column.label}</Label>
										</div>
									))}
								</div>
							</div>
						</PopoverContent>
					</Popover>

					{/* Opacity Control */}
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" className="w-[200px] justify-start">
								<PencilIcon className="mr-2 h-4 w-4" />
								Color Opacity
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[200px] p-4">
							<div className="space-y-4">
								<h4 className="font-medium leading-none">Adjust Opacity</h4>
								<Slider defaultValue={[50]} max={100} step={1} className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4" onValueChange={handleOpacityChange} />
							</div>
						</PopoverContent>
					</Popover>

					{/* Generate Graph Button */}
					<Button onClick={handleGenerateGraph} className="w-[200px]">
						Generate Graph
					</Button>
				</div>
			</div>

			{/* Shloka Display Card */}
			<Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
				<CardHeader className="border-b border-border">
					<div className="flex items-center gap-2">
						<CardTitle className="text-lg font-medium">
							{decodeURIComponent(typeof book === "string" ? book : book[0])
								.split("_")
								.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
								.join(" ")}
						</CardTitle>
						<Badge variant="outline" className="text-xs">
							{chaptno}.{shloka?.slokano}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="p-6">
					<div className="space-y-4">
						<div className="text-center space-y-2">
							{shloka?.spart.split("#").map((part, index) => (
								<p key={index} className="text-lg font-sanskrit leading-relaxed">
									{part.trim()}
								</p>
							))}
						</div>
						<Separator className="my-4" />
						<div className="flex justify-center gap-4">
							<Button variant="outline" size="sm">
								<BookOpen className="h-4 w-4 mr-2" />
								View Commentary
							</Button>
							<Button variant="outline" size="sm">
								<Share2Icon className="h-4 w-4 mr-2" />
								Share
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Main Content */}
			<div className="rounded-lg border bg-card">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							{selectedColumns.includes("index") && <TableHead className="w-[100px]">Index</TableHead>}
							{selectedColumns.includes("word") && <TableHead>Word</TableHead>}
							{selectedColumns.includes("morph_analysis") && <TableHead>Morph Analysis</TableHead>}
							{selectedColumns.includes("morph_in_context") && <TableHead>Morph In Context</TableHead>}
							{selectedColumns.includes("kaaraka_sambandha") && <TableHead>Kaaraka Relation</TableHead>}
							{selectedColumns.includes("possible_relations") && <TableHead>Possible Relations</TableHead>}
							{selectedColumns.includes("hindi_meaning") && <TableHead>Hindi Meaning</TableHead>}
							{selectedColumns.includes("bgcolor") && <TableHead>Color Code</TableHead>}
							<TableHead className="w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					{renderTableContent()}
				</Table>
			</div>

			{/* Graph Display Section */}
			{Object.keys(graphUrls).length > 0 && (
				<div className="space-y-6" data-graphs-section>
					<h2 className="text-xl font-semibold">Generated Graphs</h2>
					<div className="grid gap-6">
						{Object.entries(graphUrls).map(([sentno, svgContent]) => (
							<Card key={sentno} className="overflow-hidden">
								<CardHeader className="flex flex-row items-center justify-between">
									<CardTitle>Sentence {sentno}</CardTitle>
									<div className="flex items-center gap-2">
										<div className="flex items-center bg-muted rounded-md">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleZoomOut(sentno)}
												className="h-8 w-8 p-0"
												disabled={(zoomLevels[sentno] || DEFAULT_ZOOM) <= MIN_ZOOM}
											>
												<MinusIcon className="h-4 w-4" />
											</Button>
											<div className="w-14 text-center text-sm">{Math.round((zoomLevels[sentno] || DEFAULT_ZOOM) * 100)}%</div>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleZoomIn(sentno)}
												className="h-8 w-8 p-0"
												disabled={(zoomLevels[sentno] || DEFAULT_ZOOM) >= MAX_ZOOM}
											>
												<PlusIcon className="h-4 w-4" />
											</Button>
										</div>
										<Button variant="outline" size="sm" onClick={() => handleResetZoom(sentno)} className="h-8 px-2">
											Reset
										</Button>
									</div>
								</CardHeader>
								<CardContent className="p-0">
									<div className="relative w-full">
										<div
											ref={(el: HTMLDivElement | null) => {
												if (el) svgContainerRefs.current[sentno] = el;
											}}
											className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 
												dark:scrollbar-thumb-gray-700 scrollbar-track-transparent 
												hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-600 
												pb-4"
											style={{
												maxHeight: "70vh",
												WebkitOverflowScrolling: "touch",
											}}
										>
											<div
												style={{
													transform: `scale(${zoomLevels[sentno] || DEFAULT_ZOOM})`,
													transformOrigin: "top left",
													transition: "transform 0.2s ease-in-out",
												}}
												dangerouslySetInnerHTML={{ __html: svgContent }}
											/>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}

			{/* Loading State */}
			{loading && (
				<div className="flex items-center justify-center p-8">
					<Loader2 className="h-8 w-8 animate-spin" />
				</div>
			)}
		</div>
	);
}

const hexToRgb = (hex: string) => {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "0, 0, 0";
};
