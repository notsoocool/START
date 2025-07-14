"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, PlusCircleIcon, Trash, Save, RefreshCw, PlusCircle } from "lucide-react";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { colors } from "@/lib/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Header } from "@/components/global/analysisHeader";
import { ShlokaCard } from "@/components/global/ShlokaCard";
import { GraphDisplay } from "@/components/global/GraphDisplay";
import BookmarkButton from "@/components/global/BookmarkButton";
import { Discussions } from "@/components/global/Discussions";
import { ErrorDisplay } from "@/components/global/ErrorDisplay";

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
	userPublished: boolean;
	groupPublished: boolean;
	locked: boolean;
};

export default function AnalysisPage() {
	const params = useParams();
	const decodedBook = decodeURIComponent(params.book as string);
	const decodedPart1 = decodeURIComponent(params.part1 as string);
	const decodedPart2 = decodeURIComponent(params.part2 as string);
	const decodedChaptno = decodeURIComponent(params.chaptno as string);
	const decodedId = decodeURIComponent(params.id as string);

	const [shloka, setShloka] = useState<Shloka | null>(null);
	const [loading, setLoading] = useState(true);
	const [chapter, setChapter] = useState<any>(null);
	const [initialLoad, setInitialLoad] = useState(true);
	const [opacity, setOpacity] = useState(0.5); // Default opacity value
	const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
	const [updatedData, setUpdatedData] = useState<any[]>([]);
	const [changedRows, setChangedRows] = useState<Set<number>>(new Set()); // Track which rows have changed
	const [, setErrorMessage] = useState<string | null>(null);
	const [error, setError] = useState<{ type: string; message: string } | null>(null);
	const [graphUrls, setGraphUrls] = useState<{ [sentno: string]: string }>({});
	const [selectedMeaning, setSelectedMeaning] = useState<{ [key: number]: string }>({});
	const [allMeanings, setAllMeanings] = useState<any[]>([]); // Holds all the meanings from API response
	const [originalData, setOriginalData] = useState<any[]>([]);
	const [permissions, setPermissions] = useState(null);
	const columnOptions = [
		{ id: "index", label: "Index" },
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
	const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
	const [indexSortDirection, setIndexSortDirection] = useState<"asc" | "desc">("asc");
	const [openDialog, setOpenDialog] = useState<null | "addRow" | "deleteRow" | "meaning" | "deleteAnalysis">(null);
	const [newRowData, setNewRowData] = useState({
		anvaya_no: "",
		word: "",
		poem: "",
		morph_analysis: "",
		morph_in_context: "",
		kaaraka_sambandha: "",
		possible_relations: "",
		bgcolor: "",
		sentno: "",
		name_classification: "-",
		sarvanAma: "-",
		prayoga: "-",
		samAsa: "-",
		english_meaning: "-",
		sandhied_word: "-",
		graph: "-",
		hindi_meaning: "-",
	});
	const [shiftType, setShiftType] = useState<"main" | "sub" | "none">("main");
	const [morphInContextChanges, setMorphInContextChanges] = useState<Set<number>>(new Set());
	const [kaarakaRelationChanges, setKaarakaRelationChanges] = useState<Set<number>>(new Set());
	const [analysisId, setAnalysisId] = useState<string | null>(null);
	const [selectedWordMeaning, setSelectedWordMeaning] = useState<string>("");
	const [addRowLoading, setAddRowLoading] = useState(false);
	const [isDeletingRow, setIsDeletingRow] = useState(false);

	useEffect(() => {
		const fetchChaptersAndShlokas = async () => {
			try {
				// Fetch the book tree to get chapters
				const bookResponse = await fetch(`/api/books`);
				const bookData = await bookResponse.json();

				// Find the matching book, part1, part2 in the tree using decoded values
				const currentBook = bookData.find((b: any) => {
					// Handle null/undefined values
					const bookMatch = b.book === decodedBook;
					const part1Match = (b.part1?.[0]?.part === null && decodedPart1 === "null") || b.part1?.[0]?.part === decodedPart1;
					const part2Match = (b.part1?.[0]?.part2?.[0]?.part === null && decodedPart2 === "null") || b.part1?.[0]?.part2?.[0]?.part === decodedPart2;

					return bookMatch && part1Match && part2Match;
				});

				if (currentBook) {
					// Get chapters from the nested structure: part1[0].part2[0].chapters
					const chapters = currentBook.part1?.[0]?.part2?.[0]?.chapters || [];

					// The chapters array is already in the correct format (array of chapter numbers)
					setChapters(chapters);
				} else {
					console.log("No matching book found for:", { decodedBook, decodedPart1, decodedPart2 });
				}

				// Fetch shlokas for current chapter using decoded values
				if (decodedChaptno) {
					const shlokaResponse = await fetch(`/api/books/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}`);
					const shlokaData = await shlokaResponse.json();
					setAvailableShlokas(shlokaData.shlokas);
				}
			} catch (error) {
				console.error("Error fetching chapters or shlokas:", error);
				toast.error("Failed to load chapters or shlokas");
			}
		};
		fetchChaptersAndShlokas();
	}, [decodedBook, decodedPart1, decodedPart2, decodedChaptno]);

	useEffect(() => {
		if (!decodedId) return;

		const fetchAllData = async () => {
			// Declare variables outside try block so they're accessible in catch
			let shlokaData: any = null;
			let chapterData: any = null;
			let originalSlokano: string = "";

			try {
				setLoading(true);
				setError(null);

				// First fetch shloka data
				const shlokaResponse = await fetch(`/api/ahShloka/${decodedId}`);
				if (!shlokaResponse.ok) {
					throw new Error("Shloka not found");
				}
				shlokaData = await shlokaResponse.json();
				setShloka(shlokaData);
				originalSlokano = shlokaData.slokano;

				// Fetch available shlokas
				const availableShlokaResponse = await fetch(`/api/books/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}`);
				const availableShlokaData = await availableShlokaResponse.json();
				setAvailableShlokas(availableShlokaData.shlokas);

				// Try to fetch analysis data with the original slokano
				let chapterResponse = await fetch(`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shlokaData.slokano}`);

				// If not found, try with padded zeros (e.g., if original is "1", try "001")
				if (!chapterResponse.ok) {
					const paddedSlokano = shlokaData.slokano.padStart(3, "0");
					chapterResponse = await fetch(`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${paddedSlokano}`);

					// If found with padded zeros, this indicates a format mismatch
					if (chapterResponse.ok) {
						chapterData = await chapterResponse.json();

						// Set error about format mismatch
						setError({
							type: "FORMAT_MISMATCH",
							message: `Shloka number format mismatch. Found "${originalSlokano}" in shloka model but "${paddedSlokano}" in analysis model. Please contact admin to fix this inconsistency.
                            error_location/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}`,
						});
						return;
					}
				}

				// If we get here, either the original request succeeded or the padded request failed
				chapterData = await chapterResponse.json();

				// Check if analysis data exists and is an array
				if (!chapterData || !Array.isArray(chapterData) || chapterData.length === 0) {
					setError({
						type: "NO_ANALYSIS",
						message: `Analysis is not available for this shloka. 
                        error_location/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shlokaData?.slokano || "unknown"}`,
					});
					return;
				}

				// Check if shloka numbers match
				if (chapterData[0]?.slokano !== shlokaData?.slokano) {
					setError({
						type: "GENERAL",
						message: `Mismatch between shloka and analysis data.
                        error_location/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shlokaData?.slokano || "unknown"}`,
					});
					return;
				}

				setChapter(chapterData);
				const mappedData = chapterData.map((item: any) => ({ ...item }));
				setUpdatedData(mappedData);
				setOriginalData(mappedData);

				if (chapterData && chapterData.length > 0) {
					setAnalysisId(chapterData[0]._id);
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
				console.error("Debug - Error caught:", errorMessage); // Debug log
				console.error("Debug - Full error:", error); // Debug log

				if (errorMessage === "Analysis not available") {
					setError({
						type: "NO_ANALYSIS",
						message: `Analysis is not available for this shloka. 
                        error_location/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shlokaData?.slokano || "unknown"}`,
					});
				} else {
					setError({
						type: "GENERAL",
						message: `An error occurred while loading the analysis.
                        error_location/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shlokaData?.slokano || "unknown"}`,
					});
				}
			} finally {
				setInitialLoad(false);
				setLoading(false);
			}
		};

		fetchAllData();
	}, [decodedId, decodedBook, decodedPart1, decodedPart2, decodedChaptno]);

	const handleShlokaChange = (shlokaId: string, newChapter: string, newPart1: string, newPart2: string) => {
		console.log("Changing shloka with data:", {
			shlokaId,
			newChapter,
			newPart1,
			newPart2,
			currentShloka: availableShlokas.find((s) => s._id === shlokaId),
		});
		// Construct the URL with proper encoding and the new part1/part2 values
		const url = `/books/${encodeURIComponent(decodedBook)}/${encodeURIComponent(newPart1)}/${encodeURIComponent(newPart2)}/${newChapter}/${shlokaId}`;
		router.push(url);
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

		// Track specific field changes separately
		if (field === "morph_in_context") {
			setMorphInContextChanges((prev) => new Set(prev.add(procIndex)));
		} else if (field === "kaaraka_sambandha") {
			setKaarakaRelationChanges((prev) => new Set(prev.add(procIndex)));
		}

		// Mark the row as changed
		setChangedRows((prev) => new Set(prev.add(procIndex)));
	};

	const handleSave = async (index: number, rowOverride?: any) => {
		const currentData = rowOverride ?? updatedData[index];
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
			const response = await fetch(`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${currentData.slokano}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json", "DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "" },
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
							return `${relation},S${sentno}.${sentenceNumber}`;
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
			// Make API request to get dictionary meanings
			const response = await fetch(`https://scl.samsaadhanii.in/cgi-bin/scl/MT/dict_help_json.cgi?word=${word}`);
			const dictionaries = await response.json();

			// Update all available meanings
			setAllMeanings(dictionaries);

			// Handle response data
			if (!dictionaries?.length) {
				throw new Error("No meanings found");
			}

			// Find meaning from currently selected dictionary
			const meaning = dictionaries.find((dict: any) => dict.DICT === selectedDictionary)?.Meaning;

			// Update meaning for this word
			setSelectedMeaning((prev) => ({
				...prev,
				[procIndex]: meaning || "Meaning not found",
			}));
		} catch (error) {
			console.error("Error fetching meaning:", error);

			// Set error state for this word
			setSelectedMeaning((prev) => ({
				...prev,
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

		// Only fetch permissions once on initial mount
		if (permissions === null) {
			fetchPermissions();
		}
	}, []); // Empty dependency array ensures it only runs once

	const initiateDelete = (procIndex: number) => {
		setPendingDeleteIndex(procIndex);
		setOpenDialog("deleteRow");
	};

	const confirmDelete = async () => {
		if (pendingDeleteIndex === null) return;
		setIsDeletingRow(true);
		try {
			const currentData = updatedData[pendingDeleteIndex];
			const currentAnvayaNo = currentData.anvaya_no;
			const currentSentno = currentData.sentno;
			const [currentMain, currentSub] = currentAnvayaNo.split(".");
			const currentMainNum = parseInt(currentMain);
			const currentSubNum = parseInt(currentSub);

			const response = await fetch(`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${currentData.slokano}`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json", "DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "" },
				body: JSON.stringify({
					anvaya_no: currentAnvayaNo,
					sentno: currentData.sentno,
				}),
			});

			if (response.ok) {
				// Track changed rows
				const changedRows: number[] = [];
				const updateStateData = (prevData: any[]) => {
					const isOnlyItemInGroup = !prevData.some((item) => {
						const [itemMain] = item.anvaya_no.split(".");
						return parseInt(itemMain) === currentMainNum && item.anvaya_no !== currentAnvayaNo && item.sentno === currentSentno;
					});
					const anvayaMapping: { [key: string]: string } = {};
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
					const updateRelations = (relations: string, deletedAnvayaNo: string) => {
						if (!relations) return "-";
						return relations
							.split("#")
							.map((relation) => {
								const [type, number] = relation.split(",");
								if (number?.trim() === deletedAnvayaNo) {
									return `${type},`;
								}
								if (number && anvayaMapping[number.trim()]) {
									return `${type},${anvayaMapping[number.trim()]}`;
								}
								return relation;
							})
							.filter(Boolean)
							.join("#");
					};
					return prevData.map((item, index) => {
						if (item.sentno !== currentSentno) return item;
						const [itemMain, itemSub] = item.anvaya_no.split(".");
						const itemMainNum = parseInt(itemMain);
						const itemSubNum = parseInt(itemSub);
						if (item.anvaya_no === currentAnvayaNo) {
							changedRows.push(index);
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
						if (itemMainNum === currentMainNum && itemSubNum > currentSubNum) {
							changedRows.push(index);
							updatedItem = {
								...updatedItem,
								anvaya_no: `${itemMain}.${itemSubNum - 1}`,
							};
						}
						if (isOnlyItemInGroup && itemMainNum > currentMainNum) {
							changedRows.push(index);
							updatedItem = {
								...updatedItem,
								anvaya_no: `${itemMainNum - 1}.${itemSub}`,
							};
						}
						const oldKaaraka = updatedItem.kaaraka_sambandha;
						const oldPossible = updatedItem.possible_relations;
						updatedItem.kaaraka_sambandha = updateRelations(updatedItem.kaaraka_sambandha, currentAnvayaNo);
						updatedItem.possible_relations = updateRelations(updatedItem.possible_relations, currentAnvayaNo);
						if (oldKaaraka !== updatedItem.kaaraka_sambandha || oldPossible !== updatedItem.possible_relations) {
							changedRows.push(index);
						}
						return updatedItem;
					});
				};
				const newData = updateStateData(updatedData);
				setUpdatedData(newData);
				setOriginalData(newData);
				setChapter(newData);
				// Auto-save all changed rows except the deleted one
				for (const idx of Array.from(new Set(changedRows))) {
					if (newData[idx].deleted) continue;
					await handleSave(idx, newData[idx]);
				}
				toast.success("Row deleted and relations updated successfully!");
				setOpenDialog(null);
				setPendingDeleteIndex(null);
			}
		} catch (error) {
			console.error("Delete operation error:", error);
			toast.error("Error deleting row: " + (error as Error).message);
			setOpenDialog(null);
			setPendingDeleteIndex(null);
		} finally {
			setIsDeletingRow(false);
		}
	};

	// Helper function to determine if a field is editable based on permissions
	const isFieldEditable = (field: string) => {
		if (permissions === "Root" || permissions === "Admin" || permissions === "Editor") return true; // Admin and Root and Editor can edit everything
		if (permissions === "Annotator") {
			// Remove anvaya_no from the list of editable fields for Annotator
			return ["word", "poem", "morph_in_context", "kaaraka_sambandha"].includes(field);
		}
		return false;
	};

	const renderColumnsBasedOnPermissions = (processed: any, procIndex: number, currentProcessedData: any, isHovered: any, lookupWord: any) => {
		if (!permissions) return <TableCell></TableCell>;

		const isDeleted = currentProcessedData?.deleted;
		const deletedStyle = { backgroundColor: isDeleted ? "#f8d8da" : "transparent" };
		const deletedContent = <span className="text-gray-500">-</span>;

		const canEdit = permissions === "Editor" || permissions === "Admin" || permissions === "Root" || permissions === "Annotator";
		const showAnalysisButtons = permissions === "Editor" || permissions === "Admin" || permissions === "Root" || permissions === "Annotator";

		const handleAddToMorphAnalysis = (procIndex: number) => {
			const currentMorphInContext = currentProcessedData?.morph_in_context || processed.morph_in_context;
			const currentMorphAnalysis = currentProcessedData?.morph_analysis || processed.morph_analysis;

			// Only proceed if we have a morph_in_context value
			if (currentMorphInContext) {
				// Split current morph_analysis by "/" to check existing values
				const existingValues = currentMorphAnalysis ? currentMorphAnalysis.split("/") : [];

				// Check if the value already exists
				if (!existingValues.includes(currentMorphInContext)) {
					// Add the new value with "/" separator if there are existing values
					const newValue = currentMorphAnalysis ? `${currentMorphAnalysis}/${currentMorphInContext}` : currentMorphInContext;
					handleValueChange(procIndex, "morph_analysis", newValue);
				}
			}
		};

		const handleAddToPossibleRelations = (procIndex: number) => {
			const currentKaarakaSambandha = currentProcessedData?.kaaraka_sambandha || processed.kaaraka_sambandha;
			const currentPossibleRelations = currentProcessedData?.possible_relations || processed.possible_relations;

			if (currentKaarakaSambandha) {
				// Split current possible_relations by "#" to check existing values
				const existingValues = currentPossibleRelations ? currentPossibleRelations.split("#") : [];

				// Check if the value already exists
				if (!existingValues.includes(currentKaarakaSambandha)) {
					// Add the new value with "#" separator if there are existing values
					const newValue = currentPossibleRelations ? `${currentPossibleRelations}#${currentKaarakaSambandha}` : currentKaarakaSambandha;
					handleValueChange(procIndex, "possible_relations", newValue);
				}
			}
		};

		const renderInput = (field: string, value: string, width: string = "w-[180px]", placeholder: string) => {
			// If user permission, just return the value as text
			if (permissions === "User") {
				return <span className="px-2">{value || "-"}</span>;
			}

			const showMorphAnalysisButton = field === "morph_in_context" && showAnalysisButtons && morphInContextChanges.has(procIndex);

			const showPossibleRelationsButton = field === "kaaraka_sambandha" && showAnalysisButtons && kaarakaRelationChanges.has(procIndex);

			return (
				<div className="flex gap-2 items-center">
					<Input
						type="text"
						value={value || ""}
						onChange={(e) => handleValueChange(procIndex, field, e.target.value)}
						className={width}
						placeholder={placeholder}
						disabled={!isFieldEditable(field)}
					/>
					{showMorphAnalysisButton && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="outline" size="icon" className="size-8" onClick={() => handleAddToMorphAnalysis(procIndex)}>
										<PlusCircleIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Add to Morph Analysis</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
					{showPossibleRelationsButton && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="outline" size="icon" className="size-8" onClick={() => handleAddToPossibleRelations(procIndex)}>
										<PlusCircleIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Add to Possible Relations</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
				</div>
			);
		};

		const renderCell = (field: string, content: React.ReactNode) => {
			if (isDeleted) return <TableCell style={deletedStyle}>{deletedContent}</TableCell>;

			if (isFieldEditable(field)) {
				return <TableCell style={deletedStyle}>{content}</TableCell>;
			}

			return <TableCell style={deletedStyle}>{currentProcessedData?.[field] || processed[field]}</TableCell>;
		};

		const renderBgColor = () => (
			<TableCell style={deletedStyle}>
				{isDeleted ? (
					deletedContent
				) : isFieldEditable("bgcolor") ? (
					<Select
						value={currentProcessedData?.bgcolor || ""}
						onValueChange={(value) => handleValueChange(procIndex, "bgcolor", value)}
						disabled={permissions === "User"}
					>
						<SelectTrigger className="w-[180px]">
							<span
								style={{
									backgroundColor: currentProcessedData?.bgcolor || "transparent",
									display: "inline-block",
									width: "20px",
									height: "20px",
									marginRight: "8px",
									borderRadius: "3px",
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
				) : (
					<span
						style={{
							backgroundColor: currentProcessedData?.bgcolor || "transparent",
							display: "inline-block",
							width: "20px",
							height: "20px",
							borderRadius: "3px",
						}}
					></span>
				)}
			</TableCell>
		);

		return (
			<>
				{selectedColumns.includes("index") && (
					<TableCell style={deletedStyle}>
						{isDeleted ? (
							<span className="text-gray-500">Deleted</span>
						) : permissions === "Root" || permissions === "Admin" || permissions === "Editor" ? ( // Only Root and Admin and Editor can edit anvaya_no
							<Input
								type="text"
								value={currentProcessedData?.anvaya_no || processed.anvaya_no}
								onChange={(e) => handleValueChange(procIndex, "anvaya_no", e.target.value)}
								className="w-[60px]"
								placeholder="Enter Index"
							/>
						) : (
							processed.anvaya_no // Show as plain text for Editor and User
						)}
					</TableCell>
				)}
				{selectedColumns.includes("word") && (
					<TableCell style={deletedStyle}>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div
										onMouseEnter={() => {
											if (lookupWord) fetchMeaning(lookupWord, procIndex);
										}}
									>
										{isDeleted ? deletedContent : renderInput("word", currentProcessedData?.word || processed.word, "w-[90px]", "Enter Word")}
									</div>
								</TooltipTrigger>
								{selectedMeaning[procIndex] && (
									<TooltipContent className="w-[200px]">
										<div className="space-y-2">
											<p className="text-sm">{truncateMeaning(selectedMeaning[procIndex], 100)}</p>
											<Button
												variant="link"
												className="text-xs p-0 h-auto"
												onClick={(e) => {
													e.preventDefault();
													setSelectedWordMeaning(selectedMeaning[procIndex]);
													setOpenDialog("meaning");
												}}
											>
												Show More
											</Button>
										</div>
									</TooltipContent>
								)}
							</Tooltip>
						</TooltipProvider>
					</TableCell>
				)}
				{selectedColumns.includes("poem") && renderCell("poem", renderInput("poem", currentProcessedData?.poem, "w-[100px]", "Enter Prose Index"))}
				{selectedColumns.includes("sandhied_word") &&
					renderCell("sandhied_word", renderInput("sandhied_word", currentProcessedData?.sandhied_word, "w-[100px]", "Enter Sandhied Word"))}
				{selectedColumns.includes("morph_analysis") &&
					renderCell("morph_analysis", renderInput("morph_analysis", currentProcessedData?.morph_analysis, "w-[180px]", "Enter Morph Analysis"))}
				{selectedColumns.includes("morph_in_context") &&
					renderCell("morph_in_context", renderInput("morph_in_context", currentProcessedData?.morph_in_context, "w-[180px]", "Enter Morph in Context"))}
				{selectedColumns.includes("kaaraka_sambandha") &&
					renderCell("kaaraka_sambandha", renderInput("kaaraka_sambandha", currentProcessedData?.kaaraka_sambandha, "w-[180px]", "Enter Kaaraka Sambandha"))}
				{selectedColumns.includes("possible_relations") &&
					renderCell(
						"possible_relations",
						renderInput("possible_relations", currentProcessedData?.possible_relations, "w-[180px]", "Enter Possible Relations")
					)}
				{selectedColumns.includes("hindi_meaning") &&
					renderCell("hindi_meaning", renderInput("hindi_meaning", currentProcessedData?.hindi_meaning, "w-[180px]", "Enter Hindi Meaning"))}
				{selectedColumns.includes("bgcolor") && renderBgColor()}
				{canEdit && (
					<TableCell className="flex flex-col gap-3 items-center" style={deletedStyle}>
						<Button size="icon" onClick={() => initiateDelete(procIndex)} className="bg-red-400 size-8 text-white">
							<Trash className="size-4" />
						</Button>
						{changedRows.has(procIndex) && (
							<Button size="icon" onClick={() => handleSave(procIndex)} className="size-8">
								<Save className="size-4" />
							</Button>
						)}
					</TableCell>
				)}
			</>
		);
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
						onMouseEnter={() => setHoveredRowIndex(procIndex)}
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

	const handleSortByProseIndex = async () => {
		try {
			setLoading(true);
			const chapterResponse = await fetch(`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`);
			const chapterData = await chapterResponse.json();

			// Group and sort the data by sentno and prose index
			const groupedData = chapterData.reduce((acc: any, row: any) => {
				const sentno = row.sentno;
				if (!acc[sentno]) {
					acc[sentno] = [];
				}
				acc[sentno].push(row);
				return acc;
			}, {});

			// Sort within each group
			Object.keys(groupedData).forEach((sentno) => {
				groupedData[sentno].sort((a: any, b: any) => {
					const aIndex = parseInt(a.poem) || 0;
					const bIndex = parseInt(b.poem) || 0;
					return sortDirection === "asc" ? aIndex - bIndex : bIndex - aIndex;
				});
			});

			// Flatten the grouped data back into an array
			const sortedData = Object.values(groupedData).flat();

			setChapter(sortedData);
			setUpdatedData(sortedData);
			setOriginalData(sortedData);
			setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
		} catch (error) {
			console.error("Error fetching and sorting data:", error);
			toast.error("Error sorting data");
		} finally {
			setLoading(false);
		}
	};

	const handleSortByIndex = async () => {
		try {
			setLoading(true);
			const chapterResponse = await fetch(`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`);
			const chapterData = await chapterResponse.json();

			// Group and sort the data by sentno and anvaya_no
			const groupedData = chapterData.reduce((acc: any, row: any) => {
				const sentno = row.sentno;
				if (!acc[sentno]) {
					acc[sentno] = [];
				}
				acc[sentno].push(row);
				return acc;
			}, {});

			// Sort within each group by anvaya_no
			Object.keys(groupedData).forEach((sentno) => {
				groupedData[sentno].sort((a: any, b: any) => {
					const [aMain, aSub] = a.anvaya_no.split(".").map(Number);
					const [bMain, bSub] = b.anvaya_no.split(".").map(Number);

					if (aMain === bMain) {
						return indexSortDirection === "asc" ? aSub - bSub : bSub - aSub;
					}
					return indexSortDirection === "asc" ? aMain - bMain : bMain - aMain;
				});
			});

			// Flatten the grouped data back into an array
			const sortedData = Object.values(groupedData).flat();

			setChapter(sortedData);
			setUpdatedData(sortedData);
			setOriginalData(sortedData);
			setIndexSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
		} catch (error) {
			console.error("Error fetching and sorting data:", error);
			toast.error("Error sorting data");
		} finally {
			setLoading(false);
		}
	};

	const handleRefresh = async () => {
		try {
			setLoading(true);
			const chapterResponse = await fetch(`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`);
			const chapterData = await chapterResponse.json();

			setChapter(chapterData);
			setUpdatedData(chapterData);
			setOriginalData(chapterData);
			toast.success("Data refreshed successfully!");
		} catch (error) {
			console.error("Error refreshing data:", error);
			toast.error("Error refreshing data");
		} finally {
			setLoading(false);
		}
	};

	// Modify the handleAddRow function
	const handleAddRow = async () => {
		try {
			setAddRowLoading(true);
			if (!newRowData.anvaya_no || !newRowData.word || !newRowData.sentno) {
				toast.error("Please fill in all required fields");
				return;
			}

			const currentResponse = await fetch(`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`);
			const currentData = await currentResponse.json();

			const anvayaMapping: { [key: string]: string } = {};
			const [newMain, newSub] = newRowData.anvaya_no.split(".").map(Number);

			console.log("Starting with new anvaya number:", newRowData.anvaya_no);

			if (shiftType === "main") {
				currentData.forEach((item: any) => {
					if (item.sentno === newRowData.sentno) {
						const [itemMain, itemSub] = item.anvaya_no.split(".").map(Number);
						if (itemMain >= newMain) {
							anvayaMapping[`${itemMain}.${itemSub}`] = `${itemMain + 1}.${itemSub}`;
						}
					}
				});
			} else if (shiftType === "sub") {
				currentData.forEach((item: any) => {
					if (item.sentno === newRowData.sentno) {
						const [itemMain, itemSub] = item.anvaya_no.split(".").map(Number);
						if (itemMain === newMain && itemSub >= newSub) {
							anvayaMapping[`${itemMain}.${itemSub}`] = `${itemMain}.${itemSub + 1}`;
						}
					}
				});
			}

			console.log("Anvaya mapping created:", anvayaMapping);

			// Function to update a single relation
			const updateSingleRelation = (relation: string) => {
				if (!relation || relation === "-") return relation;

				const [type, number] = relation.split(",");
				const trimmedNumber = number?.trim();

				// Check if this number is in our mapping
				if (trimmedNumber && anvayaMapping[trimmedNumber]) {
					console.log(`Updating relation: ${relation} -> ${type},${anvayaMapping[trimmedNumber]}`);
					return `${type},${anvayaMapping[trimmedNumber]}`;
				}

				return relation;
			};

			// Function to update all relations in a string
			const updateAllRelations = (relationsStr: string) => {
				if (!relationsStr || relationsStr === "-") return relationsStr;

				// Determine the separator (# for possible_relations, ; for kaaraka_sambandha)
				const separator = relationsStr.includes("#") ? "#" : ";";

				// Split and update each relation
				const updatedRelations = relationsStr
					.split(separator)
					.map((relation) => updateSingleRelation(relation.trim()))
					.filter(Boolean); // Remove any empty relations

				return updatedRelations.join(separator);
			};

			// Update all rows with new anvaya numbers and relations
			const updatedRows = currentData.map((item: any) => {
				const updatedItem = { ...item };

				// Update anvaya number if it's in our mapping
				if (anvayaMapping[item.anvaya_no]) {
					console.log(`Updating anvaya number: ${item.anvaya_no} -> ${anvayaMapping[item.anvaya_no]}`);
					updatedItem.anvaya_no = anvayaMapping[item.anvaya_no];
				}

				// Update both relation fields
				if (item.kaaraka_sambandha && item.kaaraka_sambandha !== "-") {
					const oldKaaraka = item.kaaraka_sambandha;
					updatedItem.kaaraka_sambandha = updateAllRelations(item.kaaraka_sambandha);
					if (oldKaaraka !== updatedItem.kaaraka_sambandha) {
						console.log(`Updated kaaraka relations for ${item.anvaya_no}:`, {
							old: oldKaaraka,
							new: updatedItem.kaaraka_sambandha,
						});
					}
				}

				if (item.possible_relations && item.possible_relations !== "-") {
					const oldPossible = item.possible_relations;
					updatedItem.possible_relations = updateAllRelations(item.possible_relations);
					if (oldPossible !== updatedItem.possible_relations) {
						console.log(`Updated possible relations for ${item.anvaya_no}:`, {
							old: oldPossible,
							new: updatedItem.possible_relations,
						});
					}
				}

				return updatedItem;
			});

			// Add the new row and update all existing rows
			const response = await fetch(`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
				body: JSON.stringify({
					...newRowData,
					shiftType,
					updatedRows,
					targetMain: newMain,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to add row");
			}

			// Close dialog and reset form first
			setOpenDialog(null);
			setNewRowData({
				anvaya_no: "",
				word: "",
				poem: "",
				morph_analysis: "",
				morph_in_context: "",
				kaaraka_sambandha: "",
				possible_relations: "",
				bgcolor: "",
				sentno: "",
				name_classification: "-",
				sarvanAma: "-",
				prayoga: "-",
				samAsa: "-",
				english_meaning: "-",
				sandhied_word: "-",
				graph: "-",
				hindi_meaning: "-",
			});

			// Immediately fetch fresh data
			setLoading(true);
			const refreshResponse = await fetch(`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`);
			const refreshedData = await refreshResponse.json();

			// Update all relevant state with fresh data
			setChapter(refreshedData);
			setUpdatedData(refreshedData);
			setOriginalData(refreshedData);

			toast.success("Row added and relations updated successfully!");
		} catch (error) {
			console.error("Add row error:", error);
			toast.error("Error adding row: " + (error as Error).message);
		} finally {
			setAddRowLoading(false);
			setLoading(false);
		}
	};

	// Modify the renderAddRowButton function
	const renderAddRowButton = () => (
		<Button onClick={() => setOpenDialog("addRow")} className="flex items-center gap-2" disabled={addRowLoading}>
			{addRowLoading ? (
				<>Adding Row...</>
			) : (
				<>
					<PlusCircle className="size-4" />
					Add Row
				</>
			)}
		</Button>
	);

	// Modify the renderAddRowDialog function's footer
	const renderAddRowDialog = () => (
		<Dialog
			open={openDialog === "addRow"}
			onOpenChange={(open) => {
				if (!addRowLoading) {
					// Only allow closing if not loading
					setOpenDialog(open ? "addRow" : null);
				}
			}}
		>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Add New Row</DialogTitle>
					<DialogDescription>Enter the details for the new row. Anvaya number, word, and sentence number are required.</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<label>Anvaya Number*</label>
							<Input value={newRowData.anvaya_no} onChange={(e) => setNewRowData((prev) => ({ ...prev, anvaya_no: e.target.value }))} placeholder="e.g., 2.1" />
						</div>
						<div className="space-y-2">
							<label>Shift Type*</label>
							<Select value={shiftType} onValueChange={(value: "main" | "sub" | "none") => setShiftType(value)}>
								<SelectTrigger>
									<SelectValue placeholder="Select shift type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="main">Shift All Main Numbers</SelectItem>
									<SelectItem value="sub">Add as Sub-Number</SelectItem>
									<SelectItem value="none">Add Without Changing Others</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<label>Sentence Number*</label>
							<Input value={newRowData.sentno} onChange={(e) => setNewRowData((prev) => ({ ...prev, sentno: e.target.value }))} placeholder="e.g., 1" />
						</div>
						<div className="space-y-2">
							<label>Word*</label>
							<Input value={newRowData.word} onChange={(e) => setNewRowData((prev) => ({ ...prev, word: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<label>Prose Index</label>
							<Input value={newRowData.poem} onChange={(e) => setNewRowData((prev) => ({ ...prev, poem: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<label>Morph Analysis</label>
							<Input value={newRowData.morph_analysis} onChange={(e) => setNewRowData((prev) => ({ ...prev, morph_analysis: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<label>Morph In Context</label>
							<Input value={newRowData.morph_in_context} onChange={(e) => setNewRowData((prev) => ({ ...prev, morph_in_context: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<label>Kaaraka Relation</label>
							<Input value={newRowData.kaaraka_sambandha} onChange={(e) => setNewRowData((prev) => ({ ...prev, kaaraka_sambandha: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<label>Possible Relations</label>
							<Input value={newRowData.possible_relations} onChange={(e) => setNewRowData((prev) => ({ ...prev, possible_relations: e.target.value }))} />
						</div>
					</div>
					<div className="bg-muted p-4 rounded-md text-xs">
						<h4 className="font-medium mb-2">Shift Type Examples:</h4>
						<p className="text-muted-foreground space-y-1">
							<strong>Shift All Main Numbers:</strong>
							<br />
							1.1 → 1.1
							<br />
							2.1(new) → 2.1
							<br />
							3.1(old 2.1) → 3.1
							<br />
							4.1(old 3.1) → 4.1
							<br />
							<br />
							<strong>Add as Sub-Number:</strong>
							<br />
							1.1 → 1.1
							<br />
							2.1(new) → 2.1
							<br />
							2.2(old 2.1) → 2.2
							<br />
							3.1 → 3.1
						</p>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpenDialog(null)} disabled={addRowLoading}>
						Cancel
					</Button>
					<Button onClick={() => handleAddRow()} disabled={addRowLoading}>
						{addRowLoading ? (
							<>
								<Loader2 className="size-4 animate-spin mr-2" />
								Adding Row...
							</>
						) : (
							"Add Row"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);

	// Add this helper function to truncate the meaning
	const truncateMeaning = (meaning: string, maxLength: number) => {
		if (meaning.length <= maxLength) return meaning;
		return meaning.slice(0, maxLength) + "...";
	};

	// Modify the handleDeleteAnalysis function
	const handleDeleteAnalysis = async () => {
		try {
			// Show loading toast
			const loadingToast = toast.loading("Deleting analysis and shloka...");

			// Delete shloka first
			const deleteShlokaResponse = await fetch(`/api/ahShloka/${decodedId}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
			});

			if (!deleteShlokaResponse.ok) {
				const shlokaError = await deleteShlokaResponse.json();
				throw new Error(`Failed to delete shloka: ${shlokaError.error}`);
			}

			// Then delete analysis using the new route
			const deleteAnalysisResponse = await fetch(
				`/api/deleteShlokaAnalysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`,
				{
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
						"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
					},
				}
			);

			if (!deleteAnalysisResponse.ok) {
				const analysisError = await deleteAnalysisResponse.json();
				// If shloka was deleted but analysis deletion failed, warn the user
				toast.dismiss(loadingToast);
				toast.warning("Shloka was deleted but analysis deletion failed. Please contact admin.");
				throw new Error(`Failed to delete analysis: ${analysisError.error}`);
			}

			// Both deletions successful
			toast.dismiss(loadingToast);
			toast.success("Analysis and Shloka deleted successfully");

			// Navigate back to the chapter page
			router.push(`/books/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}`);
		} catch (error) {
			console.error("Delete error:", error);
			toast.error("Error during deletion: " + (error as Error).message);
		} finally {
			setOpenDialog(null);
		}
	};

	// Add this JSX near the end of your component, before the final closing tag
	const renderDeleteAnalysisDialog = () => (
		<Dialog open={openDialog === "deleteAnalysis"} onOpenChange={(open) => setOpenDialog(open ? "deleteAnalysis" : null)}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Entire Analysis</DialogTitle>
					<DialogDescription>Are you sure you want to delete this entire analysis and its associated shloka? This action cannot be undone.</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpenDialog(null)}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleDeleteAnalysis}>
						Delete Everything
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);

	const handleChapterChange = async (newChapter: string) => {
		try {
			setLoading(true);
			console.log("Fetching shlokas for chapter:", newChapter);
			const response = await fetch(`/api/books/${decodedBook}/${decodedPart1}/${decodedPart2}/${newChapter}`);
			if (!response.ok) throw new Error("Failed to fetch shlokas");
			const data = await response.json();
			console.log("Received shlokas data:", data);
			setAvailableShlokas(data.shlokas);
			return data.shlokas;
		} catch (error) {
			console.error("Error fetching shlokas:", error);
			toast.error("Failed to fetch shlokas for the selected chapter");
			return [];
		} finally {
			setLoading(false);
		}
	};

	const handleShlokaUpdate = (updatedShloka: { _id: string; slokano: string; spart: string }) => {
		// Update the shloka state
		setShloka((prev) => ({
			...prev!,
			slokano: updatedShloka.slokano,
			spart: updatedShloka.spart,
		}));

		// Update the URL if slokano changed
		if (updatedShloka.slokano !== shloka?.slokano) {
			const url = `/books/${encodeURIComponent(decodedBook)}/${encodeURIComponent(decodedPart1)}/${encodeURIComponent(decodedPart2)}/${decodedChaptno}/${
				updatedShloka._id
			}`;
			router.push(url);
		}
	};

	if (error) {
		return <ErrorDisplay error={error} onBack={() => window.history.back()} />;
	}

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
			<div className="flex justify-between items-center">
				<Header
					book={decodedBook}
					part1={decodedPart1}
					part2={decodedPart2}
					chaptno={decodedChaptno}
					id={decodedId}
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
					chapters={chapters}
					onChapterChange={handleChapterChange}
				/>
			</div>

			<ShlokaCard
				book={decodedBook}
				chaptno={decodedChaptno}
				shloka={shloka}
				analysisID={analysisId as string}
				permissions={permissions}
				part1={decodedPart1}
				part2={decodedPart2}
				onShlokaUpdate={handleShlokaUpdate}
			/>

			<div className="flex justify-end w-full gap-2">
				{renderAddRowButton()}
				<Button onClick={handleRefresh} className="justify-center" variant="outline" disabled={loading}>
					Refresh
				</Button>
				<Button onClick={handleSortByIndex} className="justify-center" variant="outline">
					Sort by Index {indexSortDirection === "asc" ? "↑" : "↓"}
				</Button>
				<Button onClick={handleSortByProseIndex} className="justify-center" variant="outline">
					Sort by Prose Index {sortDirection === "asc" ? "↑" : "↓"}
				</Button>
				{changedRows.size > 1 && (
					<Button onClick={handleSaveAll} className="w-5rem justify-center">
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
							{selectedColumns.includes("sandhied_word") && <TableHead>Sandhied Word</TableHead>}
							{selectedColumns.includes("morph_analysis") && <TableHead>Morph Analysis</TableHead>}
							{selectedColumns.includes("morph_in_context") && <TableHead>Morph In Context</TableHead>}
							{selectedColumns.includes("kaaraka_sambandha") && <TableHead>Kaaraka Relation</TableHead>}
							{selectedColumns.includes("possible_relations") && <TableHead>Possible Relations</TableHead>}
							{selectedColumns.includes("hindi_meaning") && <TableHead>Hindi Meaning</TableHead>}
							{selectedColumns.includes("bgcolor") && <TableHead>Color Code</TableHead>}
							{permissions !== "User" && <TableHead className="w-[100px]">Actions</TableHead>}
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

			<Dialog open={openDialog === "deleteRow"} onOpenChange={(open) => setOpenDialog(open ? "deleteRow" : null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Deletion</DialogTitle>
						<DialogDescription>Are you sure you want to delete this row? This action cannot be undone.</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpenDialog(null)} disabled={isDeletingRow}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={confirmDelete} disabled={isDeletingRow}>
							{isDeletingRow ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{renderAddRowDialog()}

			<Dialog open={openDialog === "meaning"} onOpenChange={(open) => setOpenDialog(open ? "meaning" : null)}>
				<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Complete Meaning</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						{selectedWordMeaning.split(/(?=\d+\.)/).map((part, index) => (
							<p key={index} className="text-sm">
								{part.trim()}
							</p>
						))}
					</div>
					<DialogFooter>
						<Button onClick={() => setOpenDialog(null)}>Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{renderDeleteAnalysisDialog()}

			<Card className="mt-8" id="discussions">
				<CardHeader>
					<CardTitle>Discussions</CardTitle>
				</CardHeader>
				<CardContent>
					<Discussions shlokaId={shloka._id} />
				</CardContent>
			</Card>
		</div>
	);
}
const hexToRgb = (hex: string) => {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "0, 0, 0";
};
