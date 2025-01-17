"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, PencilIcon, PlusCircleIcon, MinusIcon, PlusIcon, Trash, Save } from "lucide-react";
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
import { ChevronDownIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Header } from "@/components/global/analysisHeader";
import { ShlokaCard } from "@/components/global/ShlokaCard";
import { GraphDisplay } from "@/components/global/GraphDisplay";

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
	const [selectedMeaning, setSelectedMeaning] = useState<{ [key: number]: string }>({});
	const [allMeanings, setAllMeanings] = useState<any[]>([]); // Holds all the meanings from API response
	const [originalData, setOriginalData] = useState<any[]>([]);
	const [permissions, setPermissions] = useState(null);
	const columnOptions = [
		{ id: "index", label: "Index" },
		{ id: "word", label: "Word" },
		{ id: "poem", label: "Prose Index" },
		{ id: "morph_analysis", label: "Morph Analysis" },
		{ id: "morph_in_context", label: "Morph In Context" },
		{ id: "kaaraka_sambandha", label: "Kaaraka Relation" },
		{ id: "prose_kaaraka_sambandha", label: "Prose Kaarka Relation" },
		{ id: "possible_relations", label: "Possible Relations" },
		{ id: "hindi_meaning", label: "Hindi Meaning" },
		{ id: "bgcolor", label: "Color Code" },
	];
	const [zoomLevels, setZoomLevels] = useState<{ [key: string]: number }>({});
	const DEFAULT_ZOOM = 1;
	const MIN_ZOOM = 0.5;
	const MAX_ZOOM = 2;
	const ZOOM_STEP = 0.1;
	const [selectedDictionary, setSelectedDictionary] = useState<string>("Apte's Skt-Hnd Dict"); // Default dictionary
	const [chapters, setChapters] = useState<string[]>([]);
	const [shlokas, setShlokas] = useState<string[]>([]);
	const [availableShlokas, setAvailableShlokas] = useState<Shloka[]>([]);
	const router = useRouter();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);

	useEffect(() => {
		const fetchChapters = async () => {
			try {
				console.log("Fetching chapters for:", { book, part1, part2 }); // Debug log
				const response = await fetch(`/api/chapters/${book}/${part1}/${part2}`);
				const data = await response.json();
				console.log("Received chapters:", data.chapters); // Debug log
				setChapters(data.chapters);
			} catch (error) {
				console.error("Error fetching chapters:", error);
				// Fallback: Generate chapters 1-20 if API fails
				setChapters(Array.from({ length: 20 }, (_, i) => (i + 1).toString()));
			}
		};
		fetchChapters();
	}, [book, part1, part2]);

	useEffect(() => {
		const fetchShlokas = async () => {
			try {
				console.log("Fetching shlokas for chapter:", chaptno); // Debug log
				const response = await fetch(`/api/shlokas/${book}/${part1}/${part2}/${chaptno}`);
				const data = await response.json();
				console.log("Received shlokas:", data.shlokas); // Debug log
				setShlokas(data.shlokas);
			} catch (error) {
				console.error("Error fetching shlokas:", error);
				// Fallback: Generate shlokas 1-50 if API fails
				setShlokas(Array.from({ length: 50 }, (_, i) => (i + 1).toString()));
			}
		};
		if (chaptno) {
			fetchShlokas();
		}
	}, [book, part1, part2, chaptno]);

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

	useEffect(() => {
		const fetchAvailableShlokas = async () => {
			try {
				const response = await fetch(`/api/books/${book}/${part1}/${part2}/${chaptno}`);
				const data = await response.json();
				setAvailableShlokas(data.shlokas);
			} catch (error) {
				console.error("Error fetching shlokas:", error);
			}
		};

		fetchAvailableShlokas();
	}, [book, part1, part2, chaptno]);

	const handleShlokaChange = (shlokaId: string) => {
		router.push(`/books/${book}/${part1}/${part2}/${chaptno}/${shlokaId}`);
	};

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

	const handleSave = async (index: number) => {
		const currentData = updatedData[index];

		try {
			// Remove unnecessary fields and prepare data for update
			const dataToUpdate = {
				_id: currentData._id,
				anvaya_no: currentData.anvaya_no,
				word: currentData.word,
				poem: currentData.poem,
				sandhied_word: currentData.sandhied_word,
				morph_analysis: currentData.morph_analysis,
				morph_in_context: currentData.morph_in_context,
				kaaraka_sambandha: currentData.kaaraka_sambandha,
				possible_relations: currentData.possible_relations,
				hindi_meaning: currentData.hindi_meaning,
				english_meaning: currentData.english_meaning,
				samAsa: currentData.samAsa,
				prayoga: currentData.prayoga,
				sarvanAma: currentData.sarvanAma,
				name_classification: currentData.name_classification,
				bgcolor: currentData.bgcolor,
				sentno: currentData.sentno,
				chaptno: currentData.chaptno,
				slokano: currentData.slokano,
				book: currentData.book,
				part1: currentData.part1,
				part2: currentData.part2,
			};

			const response = await fetch(`/api/analysis/${book}/${part1}/${part2}/${chaptno}/${currentData.slokano}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(dataToUpdate),
			});

			if (response.ok) {
				setChangedRows((prev) => {
					const newSet = new Set(prev);
					newSet.delete(index);
					return newSet;
				});
				toast.success("Row updated successfully!");
			} else {
				const result = await response.json();
				toast.error("Error updating row: " + result.message);
			}
		} catch (error) {
			console.error("Save error:", error);
			toast.error("Error saving changes: " + (error as Error).message);
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
			const graphsSection = document.querySelector("[data-graphs-section]");
			if (graphsSection) {
				graphsSection.scrollIntoView({ behavior: "smooth" });
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
		"poem",
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
				setAllMeanings(jsonData);
				// Find meaning from selected dictionary
				const selectedDictMeaning = jsonData.find((dict: any) => dict.DICT === selectedDictionary)?.Meaning || "Meaning not found";
				setSelectedMeaning((prevSelected) => ({
					...prevSelected,
					[procIndex]: selectedDictMeaning,
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

	const initiateDelete = (procIndex: number) => {
		setPendingDeleteIndex(procIndex);
		setDeleteDialogOpen(true);
	};

	const confirmDelete = async () => {
		if (pendingDeleteIndex === null) return;

		try {
			const currentData = updatedData[pendingDeleteIndex];
			const currentAnvayaNo = currentData.anvaya_no;
			const currentSentno = currentData.sentno;
			const [currentMain, currentSub] = currentAnvayaNo.split(".");
			const currentMainNum = parseInt(currentMain);
			const currentSubNum = parseInt(currentSub);

			const response = await fetch(`/api/analysis/${book}/${part1}/${part2}/${chaptno}/${currentData.slokano}`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					anvaya_no: currentAnvayaNo,
					sentno: currentData.sentno,
				}),
			});

			if (response.ok) {
				const updateStateData = (prevData: any[]) => {
					// First, check if the deleted item is the only one in its group
					// Only consider items with the same sentno
					const isOnlyItemInGroup = !prevData.some((item) => {
						const [itemMain] = item.anvaya_no.split(".");
						return parseInt(itemMain) === currentMainNum && item.anvaya_no !== currentAnvayaNo && item.sentno === currentSentno;
					});

					// Create a mapping of old to new anvaya numbers
					const anvayaMapping: { [key: string]: string } = {};

					// First pass: build the mapping of old to new anvaya numbers
					// Only for items with the same sentno
					prevData.forEach((item) => {
						if (item.sentno !== currentSentno) return;

						const [itemMain, itemSub] = item.anvaya_no.split(".");
						const itemMainNum = parseInt(itemMain);
						const itemSubNum = parseInt(itemSub);

						if (itemMainNum === currentMainNum && itemSubNum > currentSubNum) {
							anvayaMapping[item.anvaya_no] = `${itemMain}.${itemSubNum - 1}`;
						} else if (isOnlyItemInGroup && itemMainNum > currentMainNum) {
							anvayaMapping[item.anvaya_no] = `${itemMainNum - 1}.${itemSub}`;
						}
					});

					// Updated helper function to update relations
					const updateRelations = (relations: string, deletedAnvayaNo: string) => {
						if (!relations) return "-";

						return relations
							.split("#")
							.map((relation) => {
								const [type, number] = relation.split(",");
								// When the relation points to the deleted anvaya number,
								// keep the type but remove the number
								if (number?.trim() === deletedAnvayaNo) {
									return `${type},`;
								}
								// Update relations that point to changed anvaya numbers
								if (number && anvayaMapping[number.trim()]) {
									return `${type},${anvayaMapping[number.trim()]}`;
								}
								return relation;
							})
							.filter(Boolean) // Remove null values
							.join("#");
					};

					return prevData.map((item, index) => {
						// Skip items with different sentno
						if (item.sentno !== currentSentno) return item;

						const [itemMain, itemSub] = item.anvaya_no.split(".");
						const itemMainNum = parseInt(itemMain);
						const itemSubNum = parseInt(itemSub);

						// Mark the deleted item
						if (item.anvaya_no === currentAnvayaNo) {
							return {
								...item,
								deleted: true,
								word: "-",
								poem: "-",
								morph_analysis: "-",
								morph_in_context: "-",
								kaaraka_sambandha: "-",
								possible_relations: "-",
								bgcolor: "-",
							};
						}

						let updatedItem = { ...item };

						// Case 1: Update items in the same main group
						if (itemMainNum === currentMainNum && itemSubNum > currentSubNum) {
							setChangedRows((prev) => new Set(prev.add(index)));
							updatedItem = {
								...updatedItem,
								anvaya_no: `${itemMain}.${itemSubNum - 1}`,
							};
						}

						// Case 2: If the deleted item was the only one in its group,
						// update all subsequent groups
						if (isOnlyItemInGroup && itemMainNum > currentMainNum) {
							setChangedRows((prev) => new Set(prev.add(index)));
							updatedItem = {
								...updatedItem,
								anvaya_no: `${itemMainNum - 1}.${itemSub}`,
							};
						}

						// Update kaaraka and possible relations
						updatedItem.kaaraka_sambandha = updateRelations(updatedItem.kaaraka_sambandha, currentAnvayaNo);
						updatedItem.possible_relations = updateRelations(updatedItem.possible_relations, currentAnvayaNo);

						return updatedItem;
					});
				};

				setUpdatedData(updateStateData);
				setOriginalData(updateStateData);
				setChapter(updateStateData);

				toast.success("Row deleted and relations updated successfully!");
				// Close the dialog and reset the pending delete index
				setDeleteDialogOpen(false);
				setPendingDeleteIndex(null);
			}
		} catch (error) {
			console.error("Delete operation error:", error);
			toast.error("Error deleting row: " + (error as Error).message);
			// Also close dialog and reset on error
			setDeleteDialogOpen(false);
			setPendingDeleteIndex(null);
		}
	};

	const renderColumnsBasedOnPermissions = (processed: any, procIndex: any, currentProcessedData: any, isHovered: any, lookupWord: any) => {
		if (!permissions) {
			return <TableCell></TableCell>;
		}
		const isDeleted = currentProcessedData?.deleted;

		const renderMorphInContextTEXT = () => {
			// Check if the current value is different from the original
			const isChanged = currentProcessedData?.morph_in_context !== processed.morph_in_context;

			const handleAddToMorphAnalysis = () => {
				const currentValue = currentProcessedData?.morph_in_context?.trim() || "";
				if (!currentValue) return;

				// Update both updatedData and originalData
				setUpdatedData((prevData) => {
					const newData = [...prevData];
					const existingAnalysis = newData[procIndex].morph_analysis || "";

					// Create the updated morph_analysis string
					const updatedMorphAnalysis = existingAnalysis ? `${existingAnalysis}/${currentValue}` : currentValue;

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
				<TableCell style={{ backgroundColor: isDeleted ? "#f8d8da" : "transparent" }}>
					{isDeleted ? (
						<span className="text-gray-500">-</span> // Indicate that the row is deleted
					) : (
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
					)}
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
				<TableCell style={{ backgroundColor: isDeleted ? "#f8d8da" : "transparent" }}>
					{isDeleted ? (
						<span className="text-gray-500">-</span> // Indicate that the row is deleted
					) : (
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
					)}
				</TableCell>
			);
		};

		const renderWord = () => (
			<TableCell>
				{isDeleted ? (
					<span className="text-gray-500">-</span> // Indicate that the row is deleted
				) : (
					<Input
						type="text"
						value={currentProcessedData?.word || ""}
						onChange={(e) => handleValueChange(procIndex, "word", e.target.value)}
						className="w-[100px]"
						placeholder="Enter Word"
					/>
				)}
			</TableCell>
		);

		const renderPoem = () => (
			<TableCell style={{ backgroundColor: isDeleted ? "#f8d8da" : "transparent" }}>
				{isDeleted ? (
					<span className="text-gray-500">-</span> // Indicate that the row is deleted
				) : (
					<Input
						type="text"
						value={currentProcessedData?.poem || ""}
						onChange={(e) => handleValueChange(procIndex, "poem", e.target.value)}
						className="w-[100px]"
						placeholder="Enter Prose Index"
					/>
				)}
			</TableCell>
		);

		const renderBgColor = () => (
			<TableCell style={{ backgroundColor: isDeleted ? "#f8d8da" : "transparent" }}>
				{isDeleted ? (
					<span className="text-gray-500">-</span> // Indicate that the row is deleted
				) : (
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
				)}
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
					{selectedColumns.includes("poem") && <TableCell>{currentProcessedData?.poem || processed.poem}</TableCell>}{" "}
					{selectedColumns.includes("morph_analysis") && <TableCell>{currentProcessedData?.morph_analysis || processed.morph_analysis}</TableCell>}
					{selectedColumns.includes("morph_in_context") && <TableCell>{currentProcessedData?.morph_in_context || processed.morph_in_context}</TableCell>}
					{selectedColumns.includes("kaaraka_sambandha") && <TableCell>{currentProcessedData?.kaaraka_sambandha || processed.kaaraka_sambandha}</TableCell>}
					{selectedColumns.includes("prose_kaaraka_sambandha") && (
						<TableCell>{currentProcessedData?.prose_kaaraka_sambandha || processed.prose_kaaraka_sambandha}</TableCell>
					)}
					{selectedColumns.includes("possible_relations") && <TableCell>{processed.possible_relations}</TableCell>}
					{selectedColumns.includes("hindi_meaning") && <TableCell>{processed.hindi_meaning}</TableCell>}
					{selectedColumns.includes("bgcolor") && <TableCell>{processed.bgcolor}</TableCell>}
				</>
			);
		} else {
			return (
				<>
					{selectedColumns.includes("index") && (
						<TableCell style={{ backgroundColor: isDeleted ? "#f8d8da" : "transparent" }}>
							{isDeleted ? (
								<span className="text-gray-500">Deleted</span> // Indicate that the row is deleted
							) : (
								processed.anvaya_no
							)}
						</TableCell>
					)}
					{selectedColumns.includes("word") && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<TableCell style={{ backgroundColor: isDeleted ? "#f8d8da" : "transparent" }}>{renderWord()}</TableCell>
								</TooltipTrigger>
								{isHovered && selectedMeaning[procIndex] && <TooltipContent>{formatMeaning(selectedMeaning[procIndex])}</TooltipContent>}
							</Tooltip>
						</TooltipProvider>
					)}
					{selectedColumns.includes("poem") && renderPoem()}
					{selectedColumns.includes("morph_analysis") && (
						<TableCell style={{ backgroundColor: isDeleted ? "#f8d7da" : "transparent" }}>
							{isDeleted ? (
								<span className="text-gray-500">-</span> // Indicate that the row is deleted
							) : (
								currentProcessedData?.morph_analysis || processed.morph_analysis
							)}
						</TableCell>
					)}{" "}
					{selectedColumns.includes("morph_in_context") && renderMorphInContextTEXT()}
					{selectedColumns.includes("kaaraka_sambandha") && renderKaarakaSambandha()}
					{selectedColumns.includes("prose_kaaraka_sambandha") && (
						<TableCell style={{ backgroundColor: isDeleted ? "#f8d8da" : "transparent" }}>
							{isDeleted ? (
								<span className="text-gray-500">-</span> // Indicate that the row is deleted
							) : (
								currentProcessedData?.prose_kaaraka_sambandha || processed.prose_kaaraka_sambandha
							)}
						</TableCell>
					)}
					{selectedColumns.includes("possible_relations") && (
						<TableCell style={{ backgroundColor: isDeleted ? "#f8d8da" : "transparent" }}>
							{isDeleted ? (
								<span className="text-gray-500">-</span> // Indicate that the row is deleted
							) : (
								currentProcessedData?.possible_relations || processed.possible_relations
							)}
						</TableCell>
					)}
					{selectedColumns.includes("hindi_meaning") && (
						<TableCell style={{ backgroundColor: isDeleted ? "#f8d8da" : "transparent" }}>{processed.hindi_meaning}</TableCell>
					)}
					{selectedColumns.includes("bgcolor") && renderBgColor()}
					<TableCell className=" flex flex-col gap-3 items-center" style={{ backgroundColor: isDeleted ? "#f8d8da" : "transparent" }}>
						<Button size="icon" onClick={() => initiateDelete(procIndex)} className="bg-red-400 size-8 text-white">
							<Trash className="size-4" />
						</Button>
						{changedRows.has(procIndex) && (
							<Button size="icon" onClick={() => handleSave(procIndex)} className="size-8">
								<Save className="size-4" />
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

	// Add this function to handle saving all changes
	const handleSaveAll = async () => {
		for (const procIndex of Array.from(changedRows)) {
			// Convert Set to Array
			await handleSave(procIndex); // Call the existing handleSave function for each changed row
		}
		toast.success("All changes saved successfully!");
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
		<div className="container mx-auto p-6 space-y-8 w-full">
			<Header
				chaptno={chaptno as string}
				id={id as string}
				shloka={shloka}
				availableShlokas={availableShlokas}
				selectedColumns={selectedColumns}
				columnOptions={columnOptions}
				selectedDictionary={selectedDictionary}
				handleShlokaChange={handleShlokaChange}
				handleColumnSelect={handleColumnSelect}
				handleOpacityChange={handleOpacityChange}
				setSelectedDictionary={setSelectedDictionary}
				handleGenerateGraph={handleGenerateGraph}
			/>

			<ShlokaCard book={book} chaptno={chaptno as string} shloka={shloka} />

			<div className="flex justify-end w-full">
				{changedRows.size > 1 && (
					<Button onClick={handleSaveAll} className="w-5rem justify-center ">
						Save All
					</Button>
				)}
			</div>
			{/* Main Content */}
			<div className="rounded-lg border bg-card">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							{selectedColumns.includes("index") && <TableHead className="w-[100px]">Index</TableHead>}
							{selectedColumns.includes("word") && <TableHead>Word</TableHead>}
							{selectedColumns.includes("poem") && <TableHead>Prose Index</TableHead>}
							{selectedColumns.includes("morph_analysis") && <TableHead>Morph Analysis</TableHead>}
							{selectedColumns.includes("morph_in_context") && <TableHead>Morph In Context</TableHead>}
							{selectedColumns.includes("kaaraka_sambandha") && <TableHead>Kaaraka Relation</TableHead>}
							{selectedColumns.includes("prose_kaaraka_sambandha") && <TableHead>Prose Kaaraka Relation</TableHead>}
							{selectedColumns.includes("possible_relations") && <TableHead>Possible Relations</TableHead>}
							{selectedColumns.includes("hindi_meaning") && <TableHead>Hindi Meaning</TableHead>}
							{selectedColumns.includes("bgcolor") && <TableHead>Color Code</TableHead>}
							<TableHead className="w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					{renderTableContent()}
				</Table>
			</div>

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

			{/* Loading State */}
			{loading && (
				<div className="flex items-center justify-center p-8">
					<Loader2 className="h-8 w-8 animate-spin" />
				</div>
			)}

			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Deletion</DialogTitle>
						<DialogDescription>Are you sure you want to delete this row? This action cannot be undone.</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={confirmDelete}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
const hexToRgb = (hex: string) => {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "0, 0, 0";
};
