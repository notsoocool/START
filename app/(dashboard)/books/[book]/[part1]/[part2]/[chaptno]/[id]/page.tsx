"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { ExclamationTriangleIcon, SliderIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { colors, validKaarakaSambandhaValues } from "@/lib/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

declare global {
	interface Window {
		toggleChildren?: (event: MouseEvent) => void;
	}
}

export default function AnalysisPage() {
	const { book, part1, part2, chaptno, id } = useParams(); // Get the shloka ID from the URL
	const [shloka, setShloka] = useState<any>(null);
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
	const [loadingPermissions, setLoadingPermissions] = useState(true);

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
				setLoading(false);
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
		const currentData = updatedData[procIndex]; // The updated row data
		const originalRowData = originalData[procIndex]; // Get the original data for this row

		// Prepare the data to send in the update request
		const updateData: any = {};

		// Only update fields that have changed compared to the original data
		if (currentData.kaaraka_sambandha !== originalRowData?.kaaraka_sambandha) {
			updateData.kaaraka_sambandha = currentData.kaaraka_sambandha;
		}
		if (currentData.morph_in_context !== originalRowData?.morph_in_context) {
			updateData.morph_in_context = currentData.morph_in_context;
		}
		if (currentData.bgcolor !== originalRowData?.bgcolor) {
			updateData.bgcolor = currentData.bgcolor;
		}

		// If there are no changes, return early
		if (Object.keys(updateData).length === 0) {
			console.log("No changes detected.");
			return;
		}

		// Ensure the correct anvaya_no and sentno are passed in the request
		const { anvaya_no, sentno } = currentData; // Get the correct anvaya_no and sentno for the row

		try {
			// Send the update request to the API
			const response = await fetch(`/api/analysis/${book}/${part1}/${part2}/${chaptno}/${currentData.slokano}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					anvaya_no, // Correct anvaya_no
					sentno, // Correct sentno
					...updateData, // Only the updated fields (like kaaraka_sambandha, morph_in_context, bgcolor)
				}),
			});

			const result = await response.json();

			if (response.ok) {
				console.log("Update successful:", result);

				// Update the React state with the new data
				setUpdatedData((prevData) => {
					const newData = [...prevData];
					newData[procIndex] = {
						...newData[procIndex],
						...updateData, // Merge the updated fields
					};
					return newData;
				});

				// Mark this row as not changed anymore
				setChangedRows((prev) => {
					const newRows = new Set(prev);
					newRows.delete(procIndex); // Remove the changed state for this row
					return newRows;
				});
			} else {
				console.error("Error updating data:", result);
			}
		} catch (error) {
			console.error("Error updating data:", error);
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
			try {
				const response = await fetch("/api/getCurrentUser");
				if (!response.ok) {
					throw new Error("User not authenticated");
				}
				const data = await response.json();
				setPermissions(data.perms); // Store permissions
			} catch (error) {
				console.error("Error fetching permissions:", error);
				setPermissions(null); // Handle error case
			} finally {
				setLoadingPermissions(false); // Stop loading
			}
		};

		fetchPermissions();
	}, []);

	const renderColumnsBasedOnPermissions = (processed: any, procIndex: any, currentProcessedData: any, isHovered: any, lookupWord: any) => {
		if (loadingPermissions) {
			return <TableCell>Loading...</TableCell>;
		}

		if (!permissions) {
			return <TableCell>Error loading permissions</TableCell>;
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

		const renderKaarakaSambandha = () => (
			<TableCell>
				<Input
					type="text"
					value={currentProcessedData?.kaaraka_sambandha || ""}
					onChange={(e) => handleValueChange(procIndex, "kaaraka_sambandha", e.target.value)}
					className="w-[180px] p-2 border rounded"
					placeholder="Enter Kaaraka Sambandha"
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
									<TableCell>
										<span>{processed.word}</span>
									</TableCell>
								</TooltipTrigger>
								{isHovered && selectedMeaning[procIndex] && <TooltipContent>{formatMeaning(selectedMeaning[procIndex])}</TooltipContent>}
							</Tooltip>
						</TooltipProvider>
					)}
					{selectedColumns.includes("morph_analysis") && <TableCell>{processed.morph_analysis}</TableCell>}
					{selectedColumns.includes("morph_in_context") && renderMorphInContext()}
					{selectedColumns.includes("kaaraka_sambandha") && renderKaarakaSambandha()}
					{selectedColumns.includes("possible_relations") && <TableCell>{processed.possible_relations}</TableCell>}
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
		<div className="p-8">
			<Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col justify-between duration-300">
				<CardHeader className="border-b border-primary-100">
					<CardTitle>
						Chapter {shloka.chaptno} - Shloka {shloka.slokano}
					</CardTitle>
				</CardHeader>
				<CardContent className="p-10">
					{/* Original Shloka */}
					<div>
						<h3 className="text-lg font-bold mb-4">Original Shloka:</h3>
						<div className="text-sm flex flex-col gap-2">
							<p>{shloka.spart1}</p>
							{shloka.spart2 && <p>{shloka.spart2}</p>}
						</div>
					</div>

					{/* Processed Segments Table */}
					<div className="w-full flex justify-between">
						<h3 className="text-lg font-bold mb-4 mt-8">Processed Segments:</h3>
						<div className="flex gap-5">
							<div className="pt-8">
								<Popover>
									<PopoverTrigger asChild>
										<Button variant="outline">
											<SliderIcon />
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-80">
										<div className="space-y-4">
											<h4 className="font-medium leading-none">Adjust Opacity</h4>
											<Slider defaultValue={[opacity * 100]} max={100} step={1} onValueChange={handleOpacityChange} />
											<div className="flex justify-between items-center">
												<span className="text-sm text-muted-foreground">Current value:</span>
												<span className="font-medium">{Math.round(opacity * 100)}</span>
											</div>
										</div>
									</PopoverContent>
								</Popover>
							</div>
							<div className="pt-8">
								<Popover>
									<PopoverTrigger asChild>
										<Button variant="outline">Select Meaning</Button>
									</PopoverTrigger>
									<PopoverContent className="w-80">
										<div className="space-y-2">
											<h4 className="font-medium leading-none">Select a Dictionary</h4>
											{allMeanings.map((meaning, index) => (
												<Button
													key={index}
													variant="ghost"
													onClick={() => {
														setSelectedDictIndex(index); // Update selected dictionary index
														setSelectedMeaning((prevSelected) => ({
															...prevSelected,
															[index]: meaning.Meaning, // Set meaning for this dictionary index
														}));
													}}
													className={selectedDictIndex === index ? "bg-blue-500 text-white" : ""} // Highlight selected dictionary
												>
													{index + 1}. {meaning.DICT}
												</Button>
											))}
										</div>
									</PopoverContent>
								</Popover>
							</div>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="outline" className="mt-8">
										Show/Hide Columns
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent className="sm:max-w-[425px]">
									<AlertDialogHeader>
										<AlertDialogTitle>Columns</AlertDialogTitle>
										<AlertDialogDescription>Choose the columns you want to show or hide.</AlertDialogDescription>
									</AlertDialogHeader>
									<div className="grid gap-4 py-4">
										<div className="flex items-center gap-2">
											<Checkbox id="index" checked={selectedColumns.includes("index")} onCheckedChange={() => handleColumnSelect("index")} />
											<Label htmlFor="index">Index</Label>
										</div>
										<div className="flex items-center gap-2">
											<Checkbox id="word" checked={selectedColumns.includes("word")} onCheckedChange={() => handleColumnSelect("word")} />
											<Label htmlFor="word">Word</Label>
										</div>
										<div className="flex items-center gap-2">
											<Checkbox
												id="morphAnalysis"
												checked={selectedColumns.includes("morph_analysis")}
												onCheckedChange={() => handleColumnSelect("morph_analysis")}
											/>
											<Label htmlFor="morphAnalysis">Morph Analysis</Label>
										</div>
										<div className="flex items-center gap-2">
											<Checkbox
												id="morphInContext"
												checked={selectedColumns.includes("morph_in_context")}
												onCheckedChange={() => handleColumnSelect("morph_in_context")}
											/>
											<Label htmlFor="morphInContext">Morph In Context</Label>
										</div>
										<div className="flex items-center gap-2">
											<Checkbox
												id="kaarakaSambandha"
												checked={selectedColumns.includes("kaaraka_sambandha")}
												onCheckedChange={() => handleColumnSelect("kaaraka_sambandha")}
											/>
											<Label htmlFor="kaarakaSambandha">Kaaraka Relation</Label>
										</div>
										<div className="flex items-center gap-2">
											<Checkbox
												id="possibleRelations"
												checked={selectedColumns.includes("possible_relations")}
												onCheckedChange={() => handleColumnSelect("possible_relations")}
											/>
											<Label htmlFor="possibleRelations">Possible Relations</Label>
										</div>
										<div className="flex items-center gap-2">
											<Checkbox
												id="hindiMeaning"
												checked={selectedColumns.includes("hindi_meaning")}
												onCheckedChange={() => handleColumnSelect("hindi_meaning")}
											/>
											<Label htmlFor="hindiMeaning">Hindi Meaning</Label>
										</div>
										<div className="flex items-center gap-2">
											<Checkbox id="bgColor" checked={selectedColumns.includes("bgcolor")} onCheckedChange={() => handleColumnSelect("bgcolor")} />
											<Label htmlFor="bgColor">Color Code</Label>
										</div>
									</div>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction>Save</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</div>

					<div>
						<Table>
							<TableHeader>
								<TableRow>
									{selectedColumns.includes("index") && <TableHead>Index</TableHead>}
									{selectedColumns.includes("word") && <TableHead>Word</TableHead>}
									{selectedColumns.includes("morph_analysis") && <TableHead>Morph Analysis</TableHead>}
									{selectedColumns.includes("morph_in_context") && <TableHead>Morph In Context</TableHead>}
									{selectedColumns.includes("kaaraka_sambandha") && <TableHead>Kaaraka Sambandha</TableHead>}
									{selectedColumns.includes("possible_relations") && <TableHead>Possible Relations</TableHead>}
									{selectedColumns.includes("hindi_meaning") && <TableHead>Hindi Meaning</TableHead>}
									{selectedColumns.includes("bgcolor") && <TableHead>Color Code</TableHead>}
								</TableRow>
							</TableHeader>
							<TableBody>
								{chapter && chapter.length > 0 ? (
									chapter.map((processed: any, procIndex: any) => {
										const currentProcessedData = updatedData[procIndex];
										const isHovered = hoveredRowIndex === procIndex;

										const lookupWord = extractWord(processed.morph_in_context);

										return (
											<TableRow
												key={procIndex}
												onMouseEnter={() => {
													setHoveredRowIndex(procIndex);
													if (!rowMeanings[procIndex]) {
														// Fetch meaning only if not already fetched
														fetchMeaning(lookupWord, procIndex);
													}
												}}
												onMouseLeave={() => setHoveredRowIndex(null)}
												style={{
													backgroundColor: `${processed.bgcolor}${Math.round((isHovered ? Math.min(opacity + 0.2, 1) : opacity) * 255)
														.toString(16)
														.padStart(2, "0")}`, // Convert opacity to hex
												}}
											>
												{renderColumnsBasedOnPermissions(processed, procIndex, currentProcessedData, isHovered, lookupWord)}
											</TableRow>
										);
									})
								) : (
									<TableRow>
										<TableCell colSpan={7} className="text-center">
											No data available
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
					<Button onClick={handleGenerateGraph} className="mb-4">
						Generate Graph
					</Button>

					{Object.entries(graphUrls).map(([sentno, svgContent]) => (
						<div key={sentno} className="mb-4">
							<h3>Graph for sentno: {sentno}</h3>
							<div
								ref={(el) => {
									svgContainerRefs.current[sentno] = el;
								}}
								dangerouslySetInnerHTML={{ __html: svgContent }}
								style={{ width: "100%", maxWidth: "600px" }}
							/>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
