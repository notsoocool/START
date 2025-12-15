"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Loader2,
	PlusCircleIcon,
	Trash,
	Save,
	RefreshCw,
	PlusCircle,
	ChevronLeft,
	ChevronRight,
	History,
	Clock,
	Undo2,
	Split,
	Merge,
} from "lucide-react";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { colors } from "@/lib/constants";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Header } from "@/components/global/analysisHeader";
import { ShlokaCard } from "@/components/global/ShlokaCard";
import { GraphDisplay } from "@/components/global/GraphDisplay";
import BookmarkButton from "@/components/global/BookmarkButton";
import { Discussions } from "@/components/global/Discussions";
import { ErrorDisplay } from "@/components/global/ErrorDisplay";
import { LoadingScreen } from "@/components/ui/loading-screen";

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
	owner: string | null;
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
	const [loadingExit, setLoadingExit] = useState(false);
	const [chapter, setChapter] = useState<any>(null);
	const [initialLoad, setInitialLoad] = useState(true);
	const [opacity, setOpacity] = useState(0.5); // Default opacity value
	const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
	const [updatedData, setUpdatedData] = useState<any[]>([]);
	const [changedRows, setChangedRows] = useState<Set<number>>(new Set()); // Track which rows have changed
	const [, setErrorMessage] = useState<string | null>(null);
	const [error, setError] = useState<{
		type: string;
		message: string;
	} | null>(null);
	const [graphUrls, setGraphUrls] = useState<{ [sentno: string]: string }>(
		{}
	);
	const [selectedMeaning, setSelectedMeaning] = useState<{
		[key: number]: string;
	}>({});
	const [allMeanings, setAllMeanings] = useState<any[]>([]); // Holds all the meanings from API response
	const [originalData, setOriginalData] = useState<any[]>([]);
	const [permissions, setPermissions] = useState(null);
	const [userGroups, setUserGroups] = useState<string[]>([]);
	const [bookAssignedGroup, setBookAssignedGroup] = useState<string | null>(
		null
	);
	const [isGroupCheckLoading, setIsGroupCheckLoading] = useState(true);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [availableLanguages, setAvailableLanguages] = useState<
		{ code: string; name: string }[]
	>([]);
	// Base column options including static columns and dynamic language columns
	// Only add languages that are NOT 'hi' (Hindi) or 'en' (English) since those have dedicated columns
	const baseColumnOptions = useMemo(
		() => [
			{ id: "index", label: "Index" },
			{ id: "word", label: "Word" },
			{ id: "poem", label: "Prose Index" },
			{ id: "sandhied_word", label: "Sandhied Word" },
			{ id: "morph_analysis", label: "Morph Analysis" },
			{ id: "morph_in_context", label: "Morph In Context" },
			{ id: "kaaraka_sambandha", label: "Kaaraka Relation" },
			{ id: "possible_relations", label: "Possible Relations" },
			{ id: "bgcolor", label: "Color Code" },
			{ id: "english_meaning", label: "English Meaning" },
			{ id: "hindi_meaning", label: "Hindi Meaning" },

			// Add dynamic language columns (excluding 'hi' and 'en' which have dedicated columns)
			...availableLanguages
				.filter((lang) => lang.code !== "hi" && lang.code !== "en")
				.map((lang) => ({
					id: `meaning_${lang.code}`,
					label: `${lang.name} Meaning`,
				})),
		],
		[availableLanguages]
	);

	// Filter out restricted columns for "User" permission
	// Users with "User" permission cannot see: morph_analysis, possible_relations, bgcolor
	const restrictedColumnsForUser = [
		"morph_analysis",
		"possible_relations",
		"bgcolor",
	];
	const columnOptions = useMemo(
		() =>
			permissions === "User"
				? baseColumnOptions.filter(
						(col) => !restrictedColumnsForUser.includes(col.id)
				  )
				: baseColumnOptions,
		[permissions, baseColumnOptions]
	);

	// Persisted column preferences (shared across all shlokas)
	const COLUMN_PREF_KEY = "column_prefs_all_shlokas";
	const DEFAULT_SELECTED_COLUMNS = [
		"index",
		"word",
		"poem",
		"morph_analysis",
		"morph_in_context",
		"kaaraka_sambandha",
		"possible_relations",
	];

	const sanitizeColumns = useCallback(
		(cols: string[]) => {
			const allowedIds = new Set(columnOptions.map((c) => c.id));
			const restricted =
				permissions === "User" ? restrictedColumnsForUser : [];
			const filtered = cols.filter(
				(id) => allowedIds.has(id) && !restricted.includes(id)
			);
			return filtered.length > 0
				? filtered
				: DEFAULT_SELECTED_COLUMNS.filter((id) => allowedIds.has(id));
		},
		[columnOptions, permissions]
	);

	const [zoomLevels, setZoomLevels] = useState<{ [key: string]: number }>({});
	const DEFAULT_ZOOM = 1;
	const MIN_ZOOM = 0.5;
	const MAX_ZOOM = 2;
	const ZOOM_STEP = 0.1;
	const [selectedDictionary, setSelectedDictionary] = useState<string>(
		"Apte's Skt-Hnd Dict"
	); // Default dictionary
	const [chapters, setChapters] = useState<string[]>([]);
	const [shlokas, setShlokas] = useState<string[]>([]);
	const [availableShlokas, setAvailableShlokas] = useState<Shloka[]>([]);
	const router = useRouter();
	const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(
		null
	);
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
	const [indexSortDirection, setIndexSortDirection] = useState<
		"asc" | "desc"
	>("asc");
	const [openDialog, setOpenDialog] = useState<
		| null
		| "addRow"
		| "deleteRow"
		| "meaning"
		| "deleteAnalysis"
		| "splitSentence"
		| "joinSentences"
	>(null);
	const [newRowData, setNewRowData] = useState<{
		anvaya_no: string;
		word: string;
		poem: string;
		morph_analysis: string;
		morph_in_context: string;
		kaaraka_sambandha: string;
		possible_relations: string;
		hindi_meaning: string;
		english_meaning: string;
		samAsa: string;
		prayoga: string;
		sarvanAma: string;
		name_classification: string;
		bgcolor: string;
		sentno: string;
		sandhied_word: string;
		graph: string;
		meanings?: { [key: string]: string };
	}>({
		anvaya_no: "",
		word: "",
		poem: "",
		morph_analysis: "",
		morph_in_context: "",
		kaaraka_sambandha: "",
		possible_relations: "",
		bgcolor: "",
		sentno: "",
		name_classification: "",
		sarvanAma: "",
		prayoga: "",
		samAsa: "",
		english_meaning: "",
		sandhied_word: "",
		graph: "",
		hindi_meaning: "",
		meanings: {},
	});
	const [shiftType, setShiftType] = useState<"main" | "sub" | "none">("main");
	const [morphInContextChanges, setMorphInContextChanges] = useState<
		Set<number>
	>(new Set());
	const [kaarakaRelationChanges, setKaarakaRelationChanges] = useState<
		Set<number>
	>(new Set());
	const [analysisId, setAnalysisId] = useState<string | null>(null);
	const [selectedWordMeaning, setSelectedWordMeaning] = useState<string>("");
	const [addRowLoading, setAddRowLoading] = useState(false);
	const [isDeletingRow, setIsDeletingRow] = useState(false);
	// Split/Join sentence state
	const [selectedRowsForSplit, setSelectedRowsForSplit] = useState<
		Set<number>
	>(new Set());
	const [newSentnoForSplit, setNewSentnoForSplit] = useState("");
	const [selectedSentnosForJoin, setSelectedSentnosForJoin] = useState<
		string[]
	>([]);
	const [targetSentnoForJoin, setTargetSentnoForJoin] = useState("");
	const [isSplitting, setIsSplitting] = useState(false);
	const [isJoining, setIsJoining] = useState(false);
	// Undo functionality state
	const UNDO_TIME_LIMIT = 86400000; // 24 hours in milliseconds (can be changed to 15000 for 15 seconds)
	const UNDO_STORAGE_KEY = `undo_history_${decodedBook}_${decodedPart1}_${decodedPart2}_${decodedChaptno}_${decodedId}`;

	const [deletedRowsHistory, setDeletedRowsHistory] = useState<
		Array<{
			deletedRow: any;
			timestamp: number;
			originalData: any[];
			affectedRows?: any[];
			currentAnvayaNo?: string;
			currentSentno?: string;
			toastId?: string | number;
		}>
	>([]);

	// Load undo history from localStorage on mount
	useEffect(() => {
		try {
			const stored = localStorage.getItem(UNDO_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				// Filter out expired entries
				const now = Date.now();
				const validEntries = parsed.filter(
					(entry: any) => now - entry.timestamp < UNDO_TIME_LIMIT
				);
				if (validEntries.length > 0) {
					setDeletedRowsHistory(validEntries);
				} else {
					// Clean up if all expired
					localStorage.removeItem(UNDO_STORAGE_KEY);
				}
			}
		} catch (error) {
			console.error("Error loading undo history:", error);
		}
	}, [UNDO_STORAGE_KEY, UNDO_TIME_LIMIT]);

	// Save undo history to localStorage whenever it changes
	useEffect(() => {
		try {
			if (deletedRowsHistory.length > 0) {
				// Don't store toastId (it's not valid after refresh anyway)
				const toStore = deletedRowsHistory.map(
					({ toastId, ...entry }) => entry
				);
				localStorage.setItem(UNDO_STORAGE_KEY, JSON.stringify(toStore));
			} else {
				localStorage.removeItem(UNDO_STORAGE_KEY);
			}
		} catch (error) {
			console.error("Error saving undo history:", error);
		}
	}, [deletedRowsHistory, UNDO_STORAGE_KEY]);

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

				// Fetch book structure and chapters
				const bookResponse = await fetch(`/api/books`);
				const bookData = await bookResponse.json();

				// Find the matching book, part1, part2 in the tree using decoded values
				const currentBook = bookData.find((b: any) => {
					// Handle null/undefined values
					const bookMatch = b.book === decodedBook;
					const part1Match =
						(b.part1?.[0]?.part === null &&
							decodedPart1 === "null") ||
						b.part1?.[0]?.part === decodedPart1;
					const part2Match =
						(b.part1?.[0]?.part2?.[0]?.part === null &&
							decodedPart2 === "null") ||
						b.part1?.[0]?.part2?.[0]?.part === decodedPart2;

					return bookMatch && part1Match && part2Match;
				});

				if (currentBook) {
					// Get chapters from the nested structure: part1[0].part2[0].chapters
					const chapters =
						currentBook.part1?.[0]?.part2?.[0]?.chapters || [];
					setChapters(chapters);
				} else {
					console.log("No matching book found for:", {
						decodedBook,
						decodedPart1,
						decodedPart2,
					});
				}

				// Fetch shloka details
				const shlokaResponse = await fetch(
					`/api/ahShloka/${decodedId}`
				);
				if (!shlokaResponse.ok) {
					throw new Error("Shloka not found");
				}
				shlokaData = await shlokaResponse.json();
				setShloka(shlokaData);
				originalSlokano = shlokaData.slokano;

				// Load available shlokas
				const availableShlokaResponse = await fetch(
					`/api/books/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}`
				);
				const availableShlokaData =
					await availableShlokaResponse.json();
				setAvailableShlokas(availableShlokaData.shlokas);

				// Load analysis data
				// Try to fetch analysis data with the original slokano
				let chapterResponse = await fetch(
					`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shlokaData.slokano}`
				);

				// If not found, try with padded zeros (e.g., if original is "1", try "001")
				if (!chapterResponse.ok) {
					const paddedSlokano = shlokaData.slokano.padStart(3, "0");
					chapterResponse = await fetch(
						`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${paddedSlokano}`
					);

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
				if (
					!chapterData ||
					!Array.isArray(chapterData) ||
					chapterData.length === 0
				) {
					setError({
						type: "NO_ANALYSIS",
						message: `Analysis is not available for this shloka. 
                        error_location/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${
							shlokaData?.slokano || "unknown"
						}`,
					});
					return;
				}

				// Check if shloka numbers match
				if (chapterData[0]?.slokano !== shlokaData?.slokano) {
					setError({
						type: "GENERAL",
						message: `Mismatch between shloka and analysis data.
                        error_location/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${
							shlokaData?.slokano || "unknown"
						}`,
					});
					return;
				}

				setChapter(chapterData);
				// Convert meanings Map to object for easier handling in React
				const mappedData = chapterData.map((item: any) => {
					const meanings = item.meanings;
					let meaningsObj = {};
					if (meanings) {
						if (meanings instanceof Map) {
							meaningsObj = Object.fromEntries(meanings);
						} else if (
							typeof meanings === "object" &&
							!Array.isArray(meanings)
						) {
							meaningsObj = meanings;
						}
					}
					return {
						...item,
						meanings: meaningsObj,
					};
				});
				setUpdatedData(mappedData);
				setOriginalData(mappedData);

				if (chapterData && chapterData.length > 0) {
					setAnalysisId(chapterData[0]._id);
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: "Unknown error occurred";
				console.error("Debug - Error caught:", errorMessage); // Debug log
				console.error("Debug - Full error:", error); // Debug log

				if (errorMessage === "Analysis not available") {
					setError({
						type: "NO_ANALYSIS",
						message: `Analysis is not available for this shloka. 
                        error_location/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${
							shlokaData?.slokano || "unknown"
						}`,
					});
				} else {
					setError({
						type: "GENERAL",
						message: `An error occurred while loading the analysis.
                        error_location/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${
							shlokaData?.slokano || "unknown"
						}`,
					});
				}
			} finally {
				// Start fade-out transition
				setLoadingExit(true);
				// Wait for fade-out animation to complete before hiding loading screen
				setTimeout(() => {
					setInitialLoad(false);
					setLoading(false);
					setLoadingExit(false);
				}, 500); // Match the duration of the exit animation
			}
		};

		fetchAllData();
	}, [decodedId, decodedBook, decodedPart1, decodedPart2, decodedChaptno]);

	const handleShlokaChange = (
		shlokaId: string,
		newChapter: string,
		newPart1: string,
		newPart2: string
	) => {
		console.log("Changing shloka with data:", {
			shlokaId,
			newChapter,
			newPart1,
			newPart2,
			currentShloka: availableShlokas.find((s) => s._id === shlokaId),
		});
		// Construct the URL with proper encoding and the new part1/part2 values
		const url = `/books/${encodeURIComponent(
			decodedBook
		)}/${encodeURIComponent(newPart1)}/${encodeURIComponent(
			newPart2
		)}/${newChapter}/${shlokaId}`;
		router.push(url);
	};

	const handleOpacityChange = (value: number[]) => {
		setOpacity(value[0] / 100); // Convert slider value to opacity
	};

	const handleValueChange = (
		procIndex: number,
		field: string,
		value: string
	) => {
		// Handle language meaning fields (format: meaning_<code>)
		if (field.startsWith("meaning_")) {
			const langCode = field.replace("meaning_", "");
			setUpdatedData((prevData) => {
				const newData = [...prevData];
				const currentMeanings = newData[procIndex]?.meanings || {};
				newData[procIndex] = {
					...newData[procIndex],
					meanings: {
						...currentMeanings,
						[langCode]: value,
					},
				};
				return newData;
			});
		} else {
			// Update the updatedData state for regular fields
			setUpdatedData((prevData) => {
				const newData = [...prevData];
				newData[procIndex] = {
					...newData[procIndex],
					[field]: value,
				};
				return newData;
			});
		}

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

		// Validate required fields
		const emptyFields = [];

		// Check for required fields that cannot be empty
		if (!currentData.word || currentData.word.trim() === "") {
			emptyFields.push("Word");
		}
		if (!currentData.sentno || currentData.sentno.trim() === "") {
			emptyFields.push("Sentence Number");
		}
		if (!currentData.anvaya_no || currentData.anvaya_no.trim() === "") {
			emptyFields.push("Anvaya Number");
		}
		if (
			!currentData.kaaraka_sambandha ||
			currentData.kaaraka_sambandha.trim() === ""
		) {
			emptyFields.push("Kaaraka Relation");
		}
		if (
			!currentData.morph_analysis ||
			currentData.morph_analysis.trim() === ""
		) {
			emptyFields.push("Morph Analysis");
		}
		if (
			!currentData.morph_in_context ||
			currentData.morph_in_context.trim() === ""
		) {
			emptyFields.push("Morph In Context");
		}
		if (
			!currentData.possible_relations ||
			currentData.possible_relations.trim() === ""
		) {
			emptyFields.push("Possible Relations");
		}
		if (emptyFields.length > 0) {
			toast.error(
				`Kindly fill the following field(s): ${emptyFields.join(", ")}`
			);
			return;
		}

		try {
			// Convert meanings object to Map format for Mongoose
			let meaningsMap = {};
			if (
				currentData.meanings &&
				typeof currentData.meanings === "object"
			) {
				meaningsMap = currentData.meanings;
			} else if (currentData.meanings instanceof Map) {
				meaningsMap = Object.fromEntries(currentData.meanings);
			}

			// Fill empty fields with "-" to prevent server errors
			// Use URL params (decodedBook, decodedPart1, decodedPart2) instead of currentData values
			// to ensure we're saving to the correct book/part combination
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
				meanings: meaningsMap, // Include meanings field
				samAsa: currentData.samAsa,
				prayoga: currentData.prayoga,
				sarvanAma: currentData.sarvanAma,
				name_classification: currentData.name_classification,
				bgcolor: currentData.bgcolor,
				sentno: currentData.sentno,
				chaptno: decodedChaptno, // Use URL param
				slokano: currentData.slokano,
				book: decodedBook, // Use URL param instead of currentData.book
				part1: decodedPart1 !== "null" ? decodedPart1 : null, // Use URL param instead of currentData.part1
				part2: decodedPart2 !== "null" ? decodedPart2 : null, // Use URL param instead of currentData.part2
			};
			const response = await fetch(
				`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${currentData.slokano}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
					},
					body: JSON.stringify(dataToUpdate),
				}
			);
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
					const kaarakaEntries =
						filteredItem.kaaraka_sambandha.split(";");

					const modifiedKaaraka = kaarakaEntries.map(
						(entry: { split: (arg0: string) => [any, any] }) => {
							const [relation, sentenceNumber] = entry.split(",");
							if (sentenceNumber) {
								return `${relation},S${sentno}.${sentenceNumber}`;
							}
							return entry;
						}
					);

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
					setErrorMessage(
						`Error generating graph for sentno: ${sentno}`
					);
				}
			}

			// Dismiss loading toast and show success
			toast.dismiss(loadingToast);
			toast.success("Graphs generated successfully!");

			// Scroll to graphs section
			setTimeout(() => {
				const graphsSection = document.querySelector(
					"[data-graphs-section]"
				);
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
			const response = await fetch(
				"https://scl.samsaadhanii.in/cgi-bin/scl/Post-editing/ViewGraph_Sentno.cgi",
				{
					method: "POST",
					body: formData,
				}
			);

			if (!response.ok) {
				throw new Error(
					"Error uploading TSV data: " + response.statusText
				);
			}

			const result = await response.text();
			setErrorMessage(null);

			// Extract image URL from response
			return result;
		} catch (error) {
			setErrorMessage(
				"Error uploading TSV data: " + (error as Error).message
			);
			return null;
		}
	};

	const svgContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>(
		{}
	);

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
	// Initialize with base columns, language columns will be added dynamically
	const [selectedColumns, setSelectedColumns] = useState<string[]>(
		DEFAULT_SELECTED_COLUMNS
	);
	const [didLoadColumnPrefs, setDidLoadColumnPrefs] = useState(false);

	// Language columns are available in baseColumnOptions but not auto-selected
	// Users can manually select them from the customize column options

	// Load saved column preferences from localStorage
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const stored = localStorage.getItem(COLUMN_PREF_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				if (Array.isArray(parsed)) {
					setSelectedColumns(sanitizeColumns(parsed));
				}
			} else {
				setSelectedColumns(sanitizeColumns(DEFAULT_SELECTED_COLUMNS));
			}
		} catch (err) {
			console.warn("Failed to load column preferences", err);
		} finally {
			setDidLoadColumnPrefs(true);
		}
	}, [COLUMN_PREF_KEY, sanitizeColumns]);

	// Persist column preferences
	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!didLoadColumnPrefs) return;
		try {
			localStorage.setItem(
				COLUMN_PREF_KEY,
				JSON.stringify(selectedColumns)
			);
		} catch (err) {
			console.warn("Failed to save column preferences", err);
		}
	}, [selectedColumns, COLUMN_PREF_KEY, didLoadColumnPrefs]);

	// Re-sanitize when permissions or available columns change
	useEffect(() => {
		setSelectedColumns((prev) => sanitizeColumns(prev));
	}, [sanitizeColumns]);

	// Sorting preference for the combined sentence view
	const [sentenceSortBy, setSentenceSortBy] = useState<"poem" | "anvaya">(
		"anvaya"
	);

	// Toggle column visibility
	const handleColumnSelect = (column: string) => {
		setSelectedColumns((prevSelected) =>
			prevSelected.includes(column)
				? prevSelected.filter((item) => item !== column)
				: [...prevSelected, column]
		);
	};

	const extractWord = (morphInContext: string) => {
		const bracketIndex = morphInContext.indexOf("{");
		return bracketIndex === -1
			? morphInContext
			: morphInContext.slice(0, bracketIndex).trim();
	};

	const fetchMeaning = async (word: string, procIndex: number) => {
		try {
			// Make API request to get dictionary meanings
			const response = await fetch(
				`https://scl.samsaadhanii.in/cgi-bin/scl/MT/dict_help_json.cgi?word=${word}`
			);
			const dictionaries = await response.json();

			// Update all available meanings
			setAllMeanings(dictionaries);

			// Handle response data
			if (!dictionaries?.length) {
				throw new Error("No meanings found");
			}

			// Find meaning from currently selected dictionary
			const meaning = dictionaries.find(
				(dict: any) => dict.DICT === selectedDictionary
			)?.Meaning;

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

	// Fetch available languages
	useEffect(() => {
		const fetchLanguages = async () => {
			try {
				const response = await fetch("/api/languages");
				if (response.ok) {
					const data = await response.json();
					const fetchedLanguages = data.languages || [];
					console.log("Fetched languages:", fetchedLanguages);
					setAvailableLanguages(fetchedLanguages);
				} else {
					console.error(
						"Failed to fetch languages:",
						response.status,
						response.statusText
					);
				}
			} catch (error) {
				console.error("Error fetching languages:", error);
			}
		};
		fetchLanguages();
	}, []);

	// Fetch permissions and group information - CONSOLIDATED INTO ONE useEffect
	useEffect(() => {
		const fetchAllPermissions = async () => {
			setIsGroupCheckLoading(true);
			try {
				// Fetch user permissions ONCE
				const userResponse = await fetch("/api/getCurrentUser");
				if (!userResponse.ok) {
					throw new Error("User not authenticated");
				}
				const userData = await userResponse.json();
				console.log("User data fetched:", {
					id: userData.id,
					perms: userData.perms,
				});
				setPermissions(userData.perms);
				setCurrentUserId(userData.id);

				// Fetch groups ONCE
				const groupsResponse = await fetch("/api/groups");
				if (!groupsResponse.ok) {
					throw new Error("Failed to fetch groups");
				}
				const groupsData = await groupsResponse.json();
				console.log(
					"Groups data fetched:",
					groupsData.length,
					"groups"
				);

				// Get user's group memberships
				const userGroups = groupsData
					.filter(
						(group: any) =>
							group.members && group.members.includes(userData.id)
					)
					.map((group: any) => group._id);
				console.log("User groups:", userGroups);
				setUserGroups(userGroups);

				// Find book's assigned group - FIXED LOGIC for multiple supervisors
				const bookGroup = groupsData.find((group: any) => {
					// Check if user is in this group AND book is assigned to it
					const userInGroup =
						group.members && group.members.includes(userData.id);
					const bookAssigned =
						group.assignedBooks &&
						group.assignedBooks.includes(decodedBook);

					console.log("Group check:", {
						groupId: group._id,
						groupName: group.name,
						userInGroup,
						bookAssigned,
						groupMembers: group.members,
						assignedBooks: group.assignedBooks,
					});

					return userInGroup && bookAssigned;
				});

				setBookAssignedGroup(bookGroup ? bookGroup._id : null);
			} catch (error) {
				setPermissions(null);
				setUserGroups([]);
				setBookAssignedGroup(null);
			} finally {
				setIsGroupCheckLoading(false);
			}
		};

		// Only fetch permissions once on initial mount
		if (permissions === null) {
			fetchAllPermissions();
		}
	}, [decodedBook]); // Only depend on decodedBook, not permissions

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
			// Ensure sentno is always a trimmed string for consistent comparison
			const currentSentno = String(currentData.sentno).trim();
			const [currentMain, currentSub] = currentAnvayaNo.split(".");
			const currentMainNum = parseInt(currentMain);
			const currentSubNum = parseInt(currentSub);

			// Store original data before deletion for undo
			const originalDataBeforeDelete = [...updatedData];

			// Store all rows that will be affected by renumbering
			const affectedRowIds: string[] = [];

			const response = await fetch(
				`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${currentData.slokano}`,
				{
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
						"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
					},
					body: JSON.stringify({
						_id: currentData._id, // Send the exact document ID
						anvaya_no: String(currentAnvayaNo).trim(),
						sentno: currentSentno,
					}),
				}
			);

			if (response.ok) {
				const result = await response.json();
				const deletedRowData = result.deletedRow;
				// Track changed rows
				const changedRows: number[] = [];
				const updateStateData = (prevData: any[]) => {
					const isOnlyItemInGroup = !prevData.some((item) => {
						const [itemMain] = item.anvaya_no.split(".");
						const itemSentno = String(item.sentno).trim();
						return (
							parseInt(itemMain) === currentMainNum &&
							item.anvaya_no !== currentAnvayaNo &&
							itemSentno === currentSentno
						);
					});
					const anvayaMapping: { [key: string]: string } = {};
					prevData.forEach((item) => {
						const itemSentno = String(item.sentno).trim();
						if (itemSentno !== currentSentno) return;
						const [itemMain, itemSub] = item.anvaya_no.split(".");
						const itemMainNum = parseInt(itemMain);
						const itemSubNum = parseInt(itemSub);
						if (
							itemMainNum === currentMainNum &&
							itemSubNum > currentSubNum
						) {
							anvayaMapping[item.anvaya_no] = `${itemMain}.${
								itemSubNum - 1
							}`;
						} else if (
							isOnlyItemInGroup &&
							itemMainNum > currentMainNum
						) {
							anvayaMapping[item.anvaya_no] = `${
								itemMainNum - 1
							}.${itemSub}`;
						}
					});
					const updateRelations = (
						relations: string,
						deletedAnvayaNo: string
					) => {
						if (!relations) return "-";
						return relations
							.split("#")
							.map((relation) => {
								const [type, number] = relation.split(",");
								if (number?.trim() === deletedAnvayaNo) {
									return `${type},`;
								}
								if (number && anvayaMapping[number.trim()]) {
									return `${type},${
										anvayaMapping[number.trim()]
									}`;
								}
								return relation;
							})
							.filter(Boolean)
							.join("#");
					};
					return prevData.map((item, index) => {
						const itemSentno = String(item.sentno).trim();
						if (itemSentno !== currentSentno) return item;
						const [itemMain, itemSub] = item.anvaya_no.split(".");
						const itemMainNum = parseInt(itemMain);
						const itemSubNum = parseInt(itemSub);
						// Compare by _id to ensure we only delete the EXACT row
						if (item._id === currentData._id) {
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
						if (
							itemMainNum === currentMainNum &&
							itemSubNum > currentSubNum
						) {
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
						updatedItem.kaaraka_sambandha = updateRelations(
							updatedItem.kaaraka_sambandha,
							currentAnvayaNo
						);
						updatedItem.possible_relations = updateRelations(
							updatedItem.possible_relations,
							currentAnvayaNo
						);
						if (
							oldKaaraka !== updatedItem.kaaraka_sambandha ||
							oldPossible !== updatedItem.possible_relations
						) {
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

				// Collect all affected rows for complete undo
				const affectedRows = changedRows.map((idx) => ({
					index: idx,
					original: originalDataBeforeDelete[idx],
					updated: newData[idx],
				}));

				// Add to undo history with complete state
				const undoEntry = {
					deletedRow: deletedRowData,
					timestamp: Date.now(),
					originalData: originalDataBeforeDelete,
					affectedRows: affectedRows, // Store what changed
					currentAnvayaNo,
					currentSentno,
				};

				// Show success toast with undo button (5 seconds display)
				const toastId = toast.success("Row deleted successfully!", {
					duration: 5000, // Toast disappears after 5 seconds
					action: {
						label: "Undo",
						onClick: () => handleUndoDelete(undoEntry),
					},
				});

				// Store with toast ID for later dismissal
				setDeletedRowsHistory((prev) => [
					...prev,
					{ ...undoEntry, toastId },
				]);

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

	// Undo delete functionality - restores deleted row AND all affected rows
	const handleUndoDelete = async (undoEntry: {
		deletedRow: any;
		timestamp: number;
		originalData: any[];
		affectedRows?: any[];
		currentAnvayaNo?: string;
		currentSentno?: string;
		toastId?: string | number;
	}) => {
		try {
			// Check if undo time limit has expired
			const timeElapsed = Date.now() - undoEntry.timestamp;
			if (timeElapsed > UNDO_TIME_LIMIT) {
				toast.error("Undo time limit expired");
				return;
			}

			// Show loading toast
			const loadingToast = toast.loading("Restoring all changes...");

			// Step 1: Restore the deleted row
			const restoreResponse = await fetch(
				`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${undoEntry.deletedRow.slokano}/restore`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
					},
					body: JSON.stringify({
						deletedRow: undoEntry.deletedRow,
					}),
				}
			);

			if (!restoreResponse.ok) {
				const error = await restoreResponse.json();
				toast.dismiss(loadingToast);
				toast.error("Failed to restore row: " + error.message);
				return;
			}

			// Step 2: Restore all affected rows to their original state
			if (undoEntry.affectedRows && undoEntry.affectedRows.length > 0) {
				const updatePromises = undoEntry.affectedRows.map(
					async (affected) => {
						if (!affected.original || affected.original.deleted)
							return;

						// Restore original anvaya_no, kaaraka_sambandha, and possible_relations
						return fetch(
							`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${affected.original.slokano}`,
							{
								method: "PUT",
								headers: {
									"Content-Type": "application/json",
									"DB-Access-Key":
										process.env.NEXT_PUBLIC_DBI_KEY || "",
								},
								body: JSON.stringify({
									_id: affected.original._id,
									anvaya_no: affected.original.anvaya_no,
									kaaraka_sambandha:
										affected.original.kaaraka_sambandha,
									possible_relations:
										affected.original.possible_relations,
									word: affected.original.word,
									poem: affected.original.poem,
									sandhied_word:
										affected.original.sandhied_word,
									morph_analysis:
										affected.original.morph_analysis,
									morph_in_context:
										affected.original.morph_in_context,
									hindi_meaning:
										affected.original.hindi_meaning,
									english_meaning:
										affected.original.english_meaning,
									samAsa: affected.original.samAsa,
									prayoga: affected.original.prayoga,
									sarvanAma: affected.original.sarvanAma,
									name_classification:
										affected.original.name_classification,
									bgcolor: affected.original.bgcolor,
									sentno: affected.original.sentno,
									chaptno: decodedChaptno, // Use URL param
									slokano: affected.original.slokano,
									book: decodedBook, // Use URL param instead of affected.original.book
									part1:
										decodedPart1 !== "null"
											? decodedPart1
											: null, // Use URL param instead of affected.original.part1
									part2:
										decodedPart2 !== "null"
											? decodedPart2
											: null, // Use URL param instead of affected.original.part2
								}),
							}
						);
					}
				);

				await Promise.all(updatePromises);
			}

			toast.dismiss(loadingToast);

			// Step 3: Refresh data to get the complete restored state
			const refreshResponse = await fetch(
				`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`
			);
			const refreshedData = await refreshResponse.json();

			// Update all relevant state with fresh data
			setChapter(refreshedData);
			setUpdatedData(refreshedData);
			setOriginalData(refreshedData);

			// Remove from undo history
			setDeletedRowsHistory((prev) =>
				prev.filter((entry) => entry.timestamp !== undoEntry.timestamp)
			);

			// Dismiss the original delete toast if it has a toastId
			if (undoEntry.toastId) {
				toast.dismiss(undoEntry.toastId);
			}

			toast.success("All changes restored successfully!");
		} catch (error) {
			console.error("Undo error:", error);
			toast.error("Error restoring: " + (error as Error).message);
		}
	};

	// Cleanup expired undo history (both in state and localStorage)
	useEffect(() => {
		const cleanupInterval = setInterval(() => {
			const now = Date.now();
			setDeletedRowsHistory((prev) => {
				const validEntries = prev.filter(
					(entry) => now - entry.timestamp < UNDO_TIME_LIMIT
				);

				// Also update localStorage
				if (validEntries.length === 0) {
					localStorage.removeItem(UNDO_STORAGE_KEY);
				}

				return validEntries;
			});
		}, 60000); // Check every minute

		return () => clearInterval(cleanupInterval);
	}, [UNDO_TIME_LIMIT, UNDO_STORAGE_KEY]);

	// Split Sentence - Move selected rows to a new sentence number
	const handleSplitSentence = async () => {
		if (selectedRowsForSplit.size === 0) {
			toast.error("Please select at least one row to split");
			return;
		}
		if (!newSentnoForSplit || newSentnoForSplit.trim() === "") {
			toast.error("Please enter a new sentence number");
			return;
		}

		setIsSplitting(true);
		try {
			const rowsToUpdate = Array.from(selectedRowsForSplit).map(
				(idx) => ({
					_id: updatedData[idx]._id,
					oldSentno: updatedData[idx].sentno,
					newSentno: newSentnoForSplit.trim(),
					...updatedData[idx],
				})
			);

			// Update each row's sentno
			const updatePromises = rowsToUpdate.map((row) =>
				fetch(
					`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${row.slokano}`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							"DB-Access-Key":
								process.env.NEXT_PUBLIC_DBI_KEY || "",
						},
						body: JSON.stringify({
							_id: row._id,
							anvaya_no: row.anvaya_no,
							word: row.word,
							poem: row.poem,
							sandhied_word: row.sandhied_word,
							morph_analysis: row.morph_analysis,
							morph_in_context: row.morph_in_context,
							kaaraka_sambandha: row.kaaraka_sambandha,
							possible_relations: row.possible_relations,
							hindi_meaning: row.hindi_meaning,
							english_meaning: row.english_meaning,
							meanings: row.meanings,
							samAsa: row.samAsa,
							prayoga: row.prayoga,
							sarvanAma: row.sarvanAma,
							name_classification: row.name_classification,
							bgcolor: row.bgcolor,
							sentno: row.newSentno,
							chaptno: decodedChaptno, // Use URL param
							slokano: row.slokano,
							book: decodedBook, // Use URL param instead of row.book
							part1:
								decodedPart1 !== "null" ? decodedPart1 : null, // Use URL param instead of row.part1
							part2:
								decodedPart2 !== "null" ? decodedPart2 : null, // Use URL param instead of row.part2
						}),
					}
				)
			);

			await Promise.all(updatePromises);

			// Refresh data
			const refreshResponse = await fetch(
				`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`
			);
			const refreshedData = await refreshResponse.json();

			setChapter(refreshedData);
			setUpdatedData(refreshedData);
			setOriginalData(refreshedData);

			toast.success(
				`Split ${rowsToUpdate.length} rows to sentence ${newSentnoForSplit}`
			);
			setOpenDialog(null);
			setSelectedRowsForSplit(new Set());
			setNewSentnoForSplit("");
		} catch (error) {
			console.error("Split sentence error:", error);
			toast.error(
				"Error splitting sentence: " + (error as Error).message
			);
		} finally {
			setIsSplitting(false);
		}
	};

	// Join Sentences - Merge two sentences into one
	const handleJoinSentences = async () => {
		if (selectedSentnosForJoin.length !== 2) {
			toast.error("Please select exactly 2 sentences to join");
			return;
		}
		if (!targetSentnoForJoin) {
			toast.error("Please select target sentence number");
			return;
		}

		setIsJoining(true);
		try {
			// Get all rows from the sentences to join
			const rowsToUpdate = updatedData
				.filter((row) =>
					selectedSentnosForJoin.includes(String(row.sentno))
				)
				.map((row) => ({
					...row,
					oldSentno: row.sentno,
					newSentno: targetSentnoForJoin,
				}));

			// Update each row's sentno
			const updatePromises = rowsToUpdate.map((row) =>
				fetch(
					`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${row.slokano}`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							"DB-Access-Key":
								process.env.NEXT_PUBLIC_DBI_KEY || "",
						},
						body: JSON.stringify({
							_id: row._id,
							anvaya_no: row.anvaya_no,
							word: row.word,
							poem: row.poem,
							sandhied_word: row.sandhied_word,
							morph_analysis: row.morph_analysis,
							morph_in_context: row.morph_in_context,
							kaaraka_sambandha: row.kaaraka_sambandha,
							possible_relations: row.possible_relations,
							hindi_meaning: row.hindi_meaning,
							english_meaning: row.english_meaning,
							meanings: row.meanings,
							samAsa: row.samAsa,
							prayoga: row.prayoga,
							sarvanAma: row.sarvanAma,
							name_classification: row.name_classification,
							bgcolor: row.bgcolor,
							sentno: row.newSentno,
							chaptno: decodedChaptno, // Use URL param
							slokano: row.slokano,
							book: decodedBook, // Use URL param instead of row.book
							part1:
								decodedPart1 !== "null" ? decodedPart1 : null, // Use URL param instead of row.part1
							part2:
								decodedPart2 !== "null" ? decodedPart2 : null, // Use URL param instead of row.part2
						}),
					}
				)
			);

			await Promise.all(updatePromises);

			// Refresh data
			const refreshResponse = await fetch(
				`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`
			);
			const refreshedData = await refreshResponse.json();

			setChapter(refreshedData);
			setUpdatedData(refreshedData);
			setOriginalData(refreshedData);

			toast.success(
				`Joined sentences ${selectedSentnosForJoin.join(
					" & "
				)} into sentence ${targetSentnoForJoin}`
			);
			setOpenDialog(null);
			setSelectedSentnosForJoin([]);
			setTargetSentnoForJoin("");
		} catch (error) {
			console.error("Join sentences error:", error);
			toast.error("Error joining sentences: " + (error as Error).message);
		} finally {
			setIsJoining(false);
		}
	};

	// Helper function to determine if a field is editable based on permissions and group membership
	const isFieldEditable = (field: string) => {
		// Admin and Root can edit everything
		if (permissions === "Root" || permissions === "Admin") {
			return true;
		}

		// User permission cannot edit anything
		if (permissions === "User") {
			return false;
		}

		// Check if user is the book owner - owners can edit everything
		if (shloka?.owner && currentUserId && shloka.owner === currentUserId) {
			return true;
		}

		// Editor and Annotator can only edit if they belong to the book's assigned group
		if (permissions === "Editor" || permissions === "Annotator") {
			// If no group is assigned to the book, they cannot edit
			if (!bookAssignedGroup) {
				return false;
			}

			// Check if user belongs to the book's assigned group
			const isInGroup = userGroups.includes(bookAssignedGroup);
			return isInGroup;
		}

		return false;
	};

	const renderColumnsBasedOnPermissions = (
		processed: any,
		procIndex: number,
		currentProcessedData: any,
		isHovered: any,
		lookupWord: any
	) => {
		if (!permissions) return <TableCell></TableCell>;

		const isDeleted = currentProcessedData?.deleted;
		const deletedStyle = {
			backgroundColor: isDeleted ? "#f8d8da" : "transparent",
		};
		const deletedContent = <span className="text-gray-500">-</span>;

		// Check if user can edit based on permissions and group membership
		const canEdit = isFieldEditable("word"); // Use the same logic for all editing permissions
		const showAnalysisButtons =
			canEdit &&
			(permissions === "Editor" ||
				permissions === "Admin" ||
				permissions === "Root" ||
				permissions === "Annotator");

		const handleAddToMorphAnalysis = (procIndex: number) => {
			const currentMorphInContext =
				currentProcessedData?.morph_in_context ||
				processed.morph_in_context;
			const currentMorphAnalysis =
				currentProcessedData?.morph_analysis ||
				processed.morph_analysis;

			// Only proceed if we have a morph_in_context value
			if (currentMorphInContext) {
				// Split current morph_analysis by "/" to check existing values
				const existingValues = currentMorphAnalysis
					? currentMorphAnalysis.split("/")
					: [];

				// Check if the value already exists
				if (!existingValues.includes(currentMorphInContext)) {
					// Add the new value with "/" separator if there are existing values
					const newValue = currentMorphAnalysis
						? `${currentMorphAnalysis}/${currentMorphInContext}`
						: currentMorphInContext;
					handleValueChange(procIndex, "morph_analysis", newValue);
				}
			}
		};

		const handleAddToPossibleRelations = (procIndex: number) => {
			const currentKaarakaSambandha =
				currentProcessedData?.kaaraka_sambandha ||
				processed.kaaraka_sambandha;
			const currentPossibleRelations =
				currentProcessedData?.possible_relations ||
				processed.possible_relations;

			if (currentKaarakaSambandha) {
				// Split current possible_relations by "#" to check existing values
				const existingValues = currentPossibleRelations
					? currentPossibleRelations.split("#")
					: [];

				// Check if the value already exists
				if (!existingValues.includes(currentKaarakaSambandha)) {
					// Add the new value with "#" separator if there are existing values
					const newValue = currentPossibleRelations
						? `${currentPossibleRelations}#${currentKaarakaSambandha}`
						: currentKaarakaSambandha;
					handleValueChange(
						procIndex,
						"possible_relations",
						newValue
					);
				}
			}
		};

		const renderInput = (
			field: string,
			value: string,
			width: string = "w-[180px]",
			placeholder: string
		) => {
			// If user doesn't have edit permissions, just return the value as text
			if (!isFieldEditable(field)) {
				return <span className="px-2">{value || "-"}</span>;
			}

			const showMorphAnalysisButton =
				field === "morph_in_context" &&
				showAnalysisButtons &&
				morphInContextChanges.has(procIndex);

			const showPossibleRelationsButton =
				field === "kaaraka_sambandha" &&
				showAnalysisButtons &&
				kaarakaRelationChanges.has(procIndex);

			return (
				<div className="flex gap-2 items-center">
					<Input
						type="text"
						value={value || ""}
						onChange={(e) =>
							handleValueChange(procIndex, field, e.target.value)
						}
						className={width}
						placeholder={placeholder}
						disabled={!isFieldEditable(field)}
					/>
					{showMorphAnalysisButton && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										size="icon"
										className="size-8"
										onClick={() =>
											handleAddToMorphAnalysis(procIndex)
										}
									>
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
									<Button
										variant="outline"
										size="icon"
										className="size-8"
										onClick={() =>
											handleAddToPossibleRelations(
												procIndex
											)
										}
									>
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
			if (isDeleted)
				return (
					<TableCell style={deletedStyle}>{deletedContent}</TableCell>
				);

			if (isFieldEditable(field)) {
				return <TableCell style={deletedStyle}>{content}</TableCell>;
			}

			return (
				<TableCell style={deletedStyle}>
					{currentProcessedData?.[field] || processed[field]}
				</TableCell>
			);
		};

		const renderBgColor = () => (
			<TableCell style={deletedStyle}>
				{isDeleted ? (
					deletedContent
				) : isFieldEditable("bgcolor") ? (
					<Select
						value={currentProcessedData?.bgcolor || ""}
						onValueChange={(value) =>
							handleValueChange(procIndex, "bgcolor", value)
						}
						disabled={!isFieldEditable("bgcolor")}
					>
						<SelectTrigger className="w-[180px]">
							<span
								style={{
									backgroundColor:
										currentProcessedData?.bgcolor ||
										"transparent",
									display: "inline-block",
									width: "20px",
									height: "20px",
									marginRight: "8px",
									borderRadius: "3px",
								}}
							></span>
							{Object.entries(colors).find(
								([key, value]) =>
									value === currentProcessedData?.bgcolor
							)?.[0] || "Select Color"}
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
							backgroundColor:
								currentProcessedData?.bgcolor || "transparent",
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
						) : isFieldEditable("anvaya_no") ? ( // Use isFieldEditable to check group membership
							<Input
								type="text"
								value={
									currentProcessedData?.anvaya_no !==
									undefined
										? currentProcessedData.anvaya_no
										: processed.anvaya_no
								}
								onChange={(e) =>
									handleValueChange(
										procIndex,
										"anvaya_no",
										e.target.value
									)
								}
								className="w-[60px]"
								placeholder="Enter Index"
							/>
						) : (
							processed.anvaya_no // Show as plain text for users without edit permissions
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
											if (lookupWord)
												fetchMeaning(
													lookupWord,
													procIndex
												);
										}}
									>
										{isDeleted
											? deletedContent
											: renderInput(
													"word",
													currentProcessedData?.word !==
														undefined
														? currentProcessedData.word
														: processed.word,
													"w-[90px]",
													"Enter Word"
											  )}
									</div>
								</TooltipTrigger>
								{selectedMeaning[procIndex] && (
									<TooltipContent className="w-[200px]">
										<div className="space-y-2">
											<p className="text-sm">
												{truncateMeaning(
													selectedMeaning[procIndex],
													100
												)}
											</p>
											<Button
												variant="link"
												className="text-xs p-0 h-auto"
												onClick={(e) => {
													e.preventDefault();
													setSelectedWordMeaning(
														selectedMeaning[
															procIndex
														]
													);
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
				{selectedColumns.includes("poem") &&
					renderCell(
						"poem",
						renderInput(
							"poem",
							currentProcessedData?.poem,
							"w-[100px]",
							"Enter Prose Index"
						)
					)}
				{selectedColumns.includes("sandhied_word") &&
					renderCell(
						"sandhied_word",
						renderInput(
							"sandhied_word",
							currentProcessedData?.sandhied_word,
							"w-[100px]",
							"Enter Sandhied Word"
						)
					)}
				{selectedColumns.includes("morph_analysis") &&
					renderCell(
						"morph_analysis",
						renderInput(
							"morph_analysis",
							currentProcessedData?.morph_analysis,
							"w-[180px]",
							"Enter Morph Analysis"
						)
					)}
				{selectedColumns.includes("morph_in_context") &&
					renderCell(
						"morph_in_context",
						renderInput(
							"morph_in_context",
							currentProcessedData?.morph_in_context,
							"w-[180px]",
							"Enter Morph in Context"
						)
					)}
				{selectedColumns.includes("kaaraka_sambandha") &&
					renderCell(
						"kaaraka_sambandha",
						renderInput(
							"kaaraka_sambandha",
							currentProcessedData?.kaaraka_sambandha,
							"w-[180px]",
							"Enter Kaaraka Sambandha"
						)
					)}
				{selectedColumns.includes("possible_relations") &&
					renderCell(
						"possible_relations",
						renderInput(
							"possible_relations",
							currentProcessedData?.possible_relations,
							"w-[180px]",
							"Enter Possible Relations"
						)
					)}
				{selectedColumns.includes("hindi_meaning") &&
					renderCell(
						"hindi_meaning",
						renderInput(
							"hindi_meaning",
							currentProcessedData?.hindi_meaning,
							"w-[180px]",
							"Enter Hindi Meaning"
						)
					)}
				{selectedColumns.includes("english_meaning") &&
					renderCell(
						"english_meaning",
						renderInput(
							"english_meaning",
							currentProcessedData?.english_meaning,
							"w-[180px]",
							"Enter English Meaning"
						)
					)}
				{/* Render dynamic language columns */}
				{availableLanguages.map((lang) => {
					const columnId = `meaning_${lang.code}`;
					if (!selectedColumns.includes(columnId)) return null;

					const meanings =
						currentProcessedData?.meanings ||
						processed?.meanings ||
						{};
					const meaningValue =
						typeof meanings === "object" && !Array.isArray(meanings)
							? meanings[lang.code] || ""
							: "";

					return renderCell(
						`meaning_${lang.code}`,
						renderInput(
							`meaning_${lang.code}`,
							meaningValue,
							"w-[180px]",
							`Enter ${lang.name} Meaning`
						)
					);
				})}
				{selectedColumns.includes("bgcolor") && renderBgColor()}
				{isFieldEditable("word") && (
					<TableCell
						className="flex flex-col gap-3 items-center"
						style={deletedStyle}
					>
						<Button
							size="icon"
							onClick={() => initiateDelete(procIndex)}
							className="bg-red-400 size-8 text-white"
						>
							<Trash className="size-4" />
						</Button>
						{changedRows.has(procIndex) && (
							<Button
								size="icon"
								onClick={() => handleSave(procIndex)}
								className="size-8"
							>
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
							backgroundColor: processed.bgcolor
								? `rgba(${hexToRgb(
										processed.bgcolor
								  )}, ${opacity})`
								: "transparent",
						}}
					>
						{renderColumnsBasedOnPermissions(
							processed,
							procIndex,
							currentProcessedData,
							isHovered,
							lookupWord
						)}
					</TableRow>
				);
			})}
		</TableBody>
	);

	const handleZoomIn = (sentno: string) => {
		setZoomLevels((prev) => ({
			...prev,
			[sentno]: Math.min(
				MAX_ZOOM,
				(prev[sentno] || DEFAULT_ZOOM) + ZOOM_STEP
			),
		}));
	};

	const handleZoomOut = (sentno: string) => {
		setZoomLevels((prev) => ({
			...prev,
			[sentno]: Math.max(
				MIN_ZOOM,
				(prev[sentno] || DEFAULT_ZOOM) - ZOOM_STEP
			),
		}));
	};

	const handleResetZoom = (sentno: string) => {
		setZoomLevels((prev) => ({
			...prev,
			[sentno]: DEFAULT_ZOOM,
		}));
	};

	// Join words but if the previous token ends with '-' (e.g., 'आदि-'), don't add a space
	const joinWordsWithHyphenRule = (tokens: string[]) => {
		let output = "";
		for (const token of tokens) {
			const word = String(token || "").trim();
			if (!word) continue;
			if (output.endsWith("-")) {
				output += word;
			} else {
				output += (output ? " " : "") + word;
			}
		}
		return output;
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
			const chapterResponse = await fetch(
				`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`
			);
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
					return sortDirection === "asc"
						? aIndex - bIndex
						: bIndex - aIndex;
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
			const chapterResponse = await fetch(
				`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`
			);
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
						return indexSortDirection === "asc"
							? aSub - bSub
							: bSub - aSub;
					}
					return indexSortDirection === "asc"
						? aMain - bMain
						: bMain - aMain;
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
			const chapterResponse = await fetch(
				`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`
			);
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

			// Validate required fields
			if (
				!newRowData.anvaya_no ||
				!newRowData.word ||
				!newRowData.sentno
			) {
				toast.error("Please fill in all required fields (*)");
				setAddRowLoading(false);
				return;
			}

			// Fill all empty fields with "-" to prevent server errors
			// Initialize meanings as empty object for new rows
			const processedData = {
				anvaya_no: newRowData.anvaya_no,
				word: newRowData.word,
				poem: newRowData.poem || "-",
				sandhied_word: newRowData.sandhied_word || "-",
				morph_analysis: newRowData.morph_analysis || "-",
				morph_in_context: newRowData.morph_in_context || "-",
				kaaraka_sambandha: newRowData.kaaraka_sambandha || "-",
				possible_relations: newRowData.possible_relations || "-",
				hindi_meaning: newRowData.hindi_meaning || "-",
				english_meaning: newRowData.english_meaning || "-",
				samAsa: newRowData.samAsa || "-",
				prayoga: newRowData.prayoga || "-",
				sarvanAma: newRowData.sarvanAma || "-",
				name_classification: newRowData.name_classification || "-",
				bgcolor: newRowData.bgcolor || "-",
				sentno: newRowData.sentno,
				chaptno: decodedChaptno,
				slokano: shloka?.slokano,
				book: decodedBook,
				part1: decodedPart1 !== "null" ? decodedPart1 : null, // Ensure null handling is consistent
				part2: decodedPart2 !== "null" ? decodedPart2 : null, // Ensure null handling is consistent
				graph: "-",
				meanings: newRowData.meanings || {},
			};

			const currentResponse = await fetch(
				`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`
			);
			const currentData = await currentResponse.json();

			const anvayaMapping: { [key: string]: string } = {};
			const [newMain, newSub] = newRowData.anvaya_no
				.split(".")
				.map(Number);

			console.log(
				"Starting with new anvaya number:",
				newRowData.anvaya_no
			);

			if (shiftType === "main") {
				currentData.forEach((item: any) => {
					if (item.sentno === newRowData.sentno) {
						const [itemMain, itemSub] = item.anvaya_no
							.split(".")
							.map(Number);
						if (itemMain >= newMain) {
							anvayaMapping[`${itemMain}.${itemSub}`] = `${
								itemMain + 1
							}.${itemSub}`;
						}
					}
				});
			} else if (shiftType === "sub") {
				currentData.forEach((item: any) => {
					if (item.sentno === newRowData.sentno) {
						const [itemMain, itemSub] = item.anvaya_no
							.split(".")
							.map(Number);
						if (itemMain === newMain && itemSub >= newSub) {
							anvayaMapping[
								`${itemMain}.${itemSub}`
							] = `${itemMain}.${itemSub + 1}`;
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
					console.log(
						`Updating relation: ${relation} -> ${type},${anvayaMapping[trimmedNumber]}`
					);
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
					console.log(
						`Updating anvaya number: ${item.anvaya_no} -> ${
							anvayaMapping[item.anvaya_no]
						}`
					);
					updatedItem.anvaya_no = anvayaMapping[item.anvaya_no];
				}

				// Update both relation fields
				if (item.kaaraka_sambandha && item.kaaraka_sambandha !== "-") {
					const oldKaaraka = item.kaaraka_sambandha;
					updatedItem.kaaraka_sambandha = updateAllRelations(
						item.kaaraka_sambandha
					);
					if (oldKaaraka !== updatedItem.kaaraka_sambandha) {
						console.log(
							`Updated kaaraka relations for ${item.anvaya_no}:`,
							{
								old: oldKaaraka,
								new: updatedItem.kaaraka_sambandha,
							}
						);
					}
				}

				if (
					item.possible_relations &&
					item.possible_relations !== "-"
				) {
					const oldPossible = item.possible_relations;
					updatedItem.possible_relations = updateAllRelations(
						item.possible_relations
					);
					if (oldPossible !== updatedItem.possible_relations) {
						console.log(
							`Updated possible relations for ${item.anvaya_no}:`,
							{
								old: oldPossible,
								new: updatedItem.possible_relations,
							}
						);
					}
				}

				return updatedItem;
			});

			// Add the new row and update all existing rows
			const response = await fetch(
				`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
					},
					body: JSON.stringify({
						...processedData,
						shiftType,
						updatedRows,
						targetMain: newMain,
					}),
				}
			);

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
				name_classification: "",
				sarvanAma: "",
				prayoga: "",
				samAsa: "",
				english_meaning: "",
				sandhied_word: "",
				graph: "",
				hindi_meaning: "",
			});

			// Immediately fetch fresh data
			setLoading(true);
			const refreshResponse = await fetch(
				`/api/analysis/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}/${shloka?.slokano}`
			);
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
	const renderAddRowButton = () => {
		if (permissions === "User") return null;

		// Check if user is the book owner
		const isBookOwner =
			shloka?.owner && currentUserId && shloka.owner === currentUserId;

		// If not owner, check group membership
		if (!isBookOwner && !isFieldEditable("word")) return null;

		return (
			<Button
				onClick={() => setOpenDialog("addRow")}
				className="flex items-center gap-2"
				disabled={addRowLoading}
			>
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
	};

	// Modify the renderAddRowDialog function's footer
	const renderAddRowDialog = () => (
		<Dialog
			open={openDialog === "addRow"}
			onOpenChange={(open) => {
				if (!addRowLoading) {
					// Only allow closing if not loading
					if (!open) {
						// Reset form when closing
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
							name_classification: "",
							sarvanAma: "",
							prayoga: "",
							samAsa: "",
							english_meaning: "",
							sandhied_word: "",
							graph: "",
							hindi_meaning: "",
						});
						setShiftType("main");
					}
					setOpenDialog(open ? "addRow" : null);
				}
			}}
		>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Add New Row</DialogTitle>
					<DialogDescription>
						Enter the details for the new row. Fields marked with *
						are required. All other fields will default to "-" if
						left empty.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						{/* Required Fields */}
						<div className="space-y-2">
							<label>Anvaya Number* (Index)</label>
							<Input
								value={newRowData.anvaya_no}
								onChange={(e) =>
									setNewRowData((prev) => ({
										...prev,
										anvaya_no: e.target.value,
									}))
								}
								placeholder="e.g., 2.1"
							/>
						</div>
						<div className="space-y-2">
							<label>Word*</label>
							<Input
								value={newRowData.word}
								onChange={(e) =>
									setNewRowData((prev) => ({
										...prev,
										word: e.target.value,
									}))
								}
								placeholder="Enter word"
							/>
						</div>
						<div className="space-y-2">
							<label>Sentence Number*</label>
							<Input
								value={newRowData.sentno}
								onChange={(e) =>
									setNewRowData((prev) => ({
										...prev,
										sentno: e.target.value,
									}))
								}
								placeholder="e.g., 1"
							/>
						</div>
						<div className="space-y-2">
							<label>Shift Type*</label>
							<Select
								value={shiftType}
								onValueChange={(
									value: "main" | "sub" | "none"
								) => setShiftType(value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select shift type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="main">
										Shift All Main Numbers
									</SelectItem>
									<SelectItem value="sub">
										Add as Sub-Number
									</SelectItem>
									<SelectItem value="none">
										Add Without Changing Others
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Table Fields Only */}
						<div className="space-y-2">
							<label>Prose Index</label>
							<Input
								value={newRowData.poem}
								onChange={(e) =>
									setNewRowData((prev) => ({
										...prev,
										poem: e.target.value,
									}))
								}
								placeholder="Will default to - if empty"
							/>
						</div>
						<div className="space-y-2">
							<label>Sandhied Word</label>
							<Input
								value={newRowData.sandhied_word}
								onChange={(e) =>
									setNewRowData((prev) => ({
										...prev,
										sandhied_word: e.target.value,
									}))
								}
								placeholder="Will default to - if empty"
							/>
						</div>
						<div className="space-y-2">
							<label>Morph Analysis</label>
							<Input
								value={newRowData.morph_analysis}
								onChange={(e) =>
									setNewRowData((prev) => ({
										...prev,
										morph_analysis: e.target.value,
									}))
								}
								placeholder="Will default to - if empty"
							/>
						</div>
						<div className="space-y-2">
							<label>Morph In Context</label>
							<Input
								value={newRowData.morph_in_context}
								onChange={(e) =>
									setNewRowData((prev) => ({
										...prev,
										morph_in_context: e.target.value,
									}))
								}
								placeholder="Will default to - if empty"
							/>
						</div>
						<div className="space-y-2">
							<label>Kaaraka Relation</label>
							<Input
								value={newRowData.kaaraka_sambandha}
								onChange={(e) =>
									setNewRowData((prev) => ({
										...prev,
										kaaraka_sambandha: e.target.value,
									}))
								}
								placeholder="Will default to - if empty"
							/>
						</div>
						<div className="space-y-2">
							<label>Possible Relations</label>
							<Input
								value={newRowData.possible_relations}
								onChange={(e) =>
									setNewRowData((prev) => ({
										...prev,
										possible_relations: e.target.value,
									}))
								}
								placeholder="Will default to - if empty"
							/>
						</div>
						<div className="space-y-2">
							<label>Hindi Meaning</label>
							<Input
								value={newRowData.hindi_meaning}
								onChange={(e) =>
									setNewRowData((prev) => ({
										...prev,
										hindi_meaning: e.target.value,
									}))
								}
								placeholder="Will default to - if empty"
							/>
						</div>
						<div className="space-y-2">
							<label>Color Code</label>
							<Select
								value={newRowData.bgcolor}
								onValueChange={(value) =>
									setNewRowData((prev) => ({
										...prev,
										bgcolor: value,
									}))
								}
							>
								<SelectTrigger>
									<span
										style={{
											backgroundColor:
												newRowData.bgcolor ||
												"transparent",
											display: "inline-block",
											width: "20px",
											height: "20px",
											marginRight: "8px",
											borderRadius: "3px",
										}}
									></span>
									{Object.entries(colors).find(
										([key, value]) =>
											value === newRowData.bgcolor
									)?.[0] || "Select Color"}
								</SelectTrigger>
								<SelectContent>
									{Object.entries(colors).map(
										([key, color]) => (
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
										)
									)}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md text-xs border border-blue-200 dark:border-blue-800">
						<p className="text-blue-800 dark:text-blue-200">
							<strong>Note:</strong> All fields except those
							marked with * will automatically default to "-" if
							left empty.
						</p>
					</div>
					<div className="bg-muted p-4 rounded-md text-xs">
						<h4 className="font-medium mb-2">
							Shift Type Examples:
						</h4>
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
					<Button
						variant="outline"
						onClick={() => setOpenDialog(null)}
						disabled={addRowLoading}
					>
						Cancel
					</Button>
					<Button
						onClick={() => handleAddRow()}
						disabled={addRowLoading}
					>
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
			const loadingToast = toast.loading(
				"Deleting analysis and shloka..."
			);

			// Delete shloka first
			const deleteShlokaResponse = await fetch(
				`/api/ahShloka/${decodedId}`,
				{
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
						"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
					},
				}
			);

			if (!deleteShlokaResponse.ok) {
				const shlokaError = await deleteShlokaResponse.json();
				throw new Error(
					`Failed to delete shloka: ${shlokaError.error}`
				);
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
				toast.warning(
					"Shloka was deleted but analysis deletion failed. Please contact admin."
				);
				throw new Error(
					`Failed to delete analysis: ${analysisError.error}`
				);
			}

			// Both deletions successful
			toast.dismiss(loadingToast);
			toast.success("Analysis and Shloka deleted successfully");

			// Navigate back to the chapter page
			router.push(
				`/books/${decodedBook}/${decodedPart1}/${decodedPart2}/${decodedChaptno}`
			);
		} catch (error) {
			console.error("Delete error:", error);
			toast.error("Error during deletion: " + (error as Error).message);
		} finally {
			setOpenDialog(null);
		}
	};

	// Add this JSX near the end of your component, before the final closing tag
	const renderDeleteAnalysisDialog = () => (
		<Dialog
			open={openDialog === "deleteAnalysis"}
			onOpenChange={(open) =>
				setOpenDialog(open ? "deleteAnalysis" : null)
			}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Entire Analysis</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this entire analysis and
						its associated shloka? This action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setOpenDialog(null)}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleDeleteAnalysis}
					>
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
			const response = await fetch(
				`/api/books/${decodedBook}/${decodedPart1}/${decodedPart2}/${newChapter}`
			);
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

	const handleShlokaUpdate = (updatedShloka: {
		_id: string;
		slokano: string;
		spart: string;
	}) => {
		// Update the shloka state
		setShloka((prev) => ({
			...prev!,
			slokano: updatedShloka.slokano,
			spart: updatedShloka.spart,
		}));

		// Update the URL if slokano changed
		if (updatedShloka.slokano !== shloka?.slokano) {
			const url = `/books/${encodeURIComponent(
				decodedBook
			)}/${encodeURIComponent(decodedPart1)}/${encodeURIComponent(
				decodedPart2
			)}/${decodedChaptno}/${updatedShloka._id}`;
			router.push(url);
		}
	};

	// Navigation functions for prev/next shloka
	const handlePreviousShloka = () => {
		if (!shloka || !availableShlokas.length) return;

		const currentIndex = availableShlokas.findIndex(
			(s) => s._id === decodedId
		);
		if (currentIndex > 0) {
			const prevShloka = availableShlokas[currentIndex - 1];
			handleShlokaChange(
				prevShloka._id,
				decodedChaptno,
				decodedPart1,
				decodedPart2
			);
		}
	};

	const handleNextShloka = () => {
		if (!shloka || !availableShlokas.length) return;

		const currentIndex = availableShlokas.findIndex(
			(s) => s._id === decodedId
		);
		if (currentIndex < availableShlokas.length - 1) {
			const nextShloka = availableShlokas[currentIndex + 1];
			handleShlokaChange(
				nextShloka._id,
				decodedChaptno,
				decodedPart1,
				decodedPart2
			);
		}
	};

	const canGoPrevious = () => {
		if (!shloka || !availableShlokas.length) return false;
		const currentIndex = availableShlokas.findIndex(
			(s) => s._id === decodedId
		);
		return currentIndex > 0;
	};

	const canGoNext = () => {
		if (!shloka || !availableShlokas.length) return false;
		const currentIndex = availableShlokas.findIndex(
			(s) => s._id === decodedId
		);
		return currentIndex < availableShlokas.length - 1;
	};

	// Helper function to get group status message
	const getGroupStatusMessage = () => {
		// Check if user is the book owner first
		if (shloka?.owner && currentUserId && shloka.owner === currentUserId) {
			return "Book Owner - Full editing access";
		}

		if (permissions === "User") return "User permission - Read only";
		if (permissions === "Root" || permissions === "Admin")
			return `${permissions} permission - Full access`;

		if (permissions === "Editor" || permissions === "Annotator") {
			if (!bookAssignedGroup) {
				return `${permissions} permission - No group assigned to this book (Contact admin)`;
			}
			if (userGroups.includes(bookAssignedGroup)) {
				return `${permissions} permission - Full editing access`;
			} else {
				return `${permissions} permission - Book not assigned to your group (Contact admin)`;
			}
		}

		return "Unknown permission status";
	};

	if (error) {
		return (
			<ErrorDisplay error={error} onBack={() => window.history.back()} />
		);
	}

	// Show loading screen only during initial load, not during permission checks
	if (initialLoad || loading) {
		return (
			<LoadingScreen
				text="Loading Analysis..."
				loadingExit={loadingExit}
			/>
		);
	}

	// Show a fallback loading state if permissions are still being fetched
	if (isGroupCheckLoading && !permissions) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
					<p className="text-lg">Loading permissions...</p>
					<p className="text-sm text-muted-foreground">
						Please wait while we verify your access
					</p>
				</div>
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
		<div className="relative min-h-screen bg-fixed bg-gradient-to-b from-white/80 to-slate-50/80 dark:from-gray-900/80 dark:to-gray-900/80">
			{/* Fixed Previous Button on Left */}
			{canGoPrevious() && (
				<Button
					onClick={handlePreviousShloka}
					className="fixed left-4 top-1/2 -translate-y-1/2 z-50 rounded-full h-12 w-12 shadow-lg"
					variant="outline"
					size="icon"
				>
					<ChevronLeft className="h-6 w-6" />
				</Button>
			)}

			{/* Fixed Next Button on Right */}
			{canGoNext() && (
				<Button
					onClick={handleNextShloka}
					className="fixed right-4 top-1/2 -translate-y-1/2 z-50 rounded-full h-12 w-12 shadow-lg"
					variant="outline"
					size="icon"
				>
					<ChevronRight className="h-6 w-6" />
				</Button>
			)}

			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:py-10">
				<div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
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

				{/* Group Status Indicator */}
				{permissions && !isGroupCheckLoading && (
					<div className="bg-muted p-3 rounded-md">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">
								Permission Status:
							</span>
							<span
								className={`text-sm px-2 py-1 rounded ${
									isFieldEditable("word")
										? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
										: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
								}`}
							>
								{getGroupStatusMessage()}
							</span>
						</div>
					</div>
				)}

				<ShlokaCard
					book={decodedBook}
					chaptno={decodedChaptno}
					shloka={shloka}
					analysisID={analysisId as string}
					permissions={permissions}
					part1={decodedPart1}
					part2={decodedPart2}
					onShlokaUpdate={handleShlokaUpdate}
					userGroups={userGroups}
					bookAssignedGroup={bookAssignedGroup}
				/>

				{/* Combined sentence(s) from Word column */}
				{(() => {
					// Build sentences grouped by sentno, ordered by prose index (poem)
					const grouped: { [key: string]: any[] } = {};
					(updatedData || []).forEach((row) => {
						if (!row) return;
						const sentKey = String(row.sentno ?? "");
						if (!sentKey) return;
						if (!grouped[sentKey]) grouped[sentKey] = [];
						grouped[sentKey].push(row);
					});

					const sentences = Object.keys(grouped)
						.sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0))
						.map((sentno) => {
							const rows = grouped[sentno]
								.slice()
								.sort((a, b) => {
									if (sentenceSortBy === "poem") {
										const ai = parseInt(a?.poem) || 0;
										const bi = parseInt(b?.poem) || 0;
										if (ai !== bi) return ai - bi;
									}
									// fallback or explicit anvaya sort
									const [am, as] = String(
										a?.anvaya_no || "0.0"
									)
										.split(".")
										.map(Number);
									const [bm, bs] = String(
										b?.anvaya_no || "0.0"
									)
										.split(".")
										.map(Number);
									if (am !== bm) return am - bm;
									return (as || 0) - (bs || 0);
								});

							const words = rows
								.map((r) => String(r?.word || "").trim())
								.filter((w) => w && w !== "-");
							return {
								sentno,
								text: joinWordsWithHyphenRule(words),
							};
						});

					if (!sentences.length) return null;

					return (
						<Card className="border-dashed">
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="text-base">
										Sentence(s) from Word column
									</CardTitle>
									<div className="flex gap-2">
										<Button
											variant={
												sentenceSortBy === "anvaya"
													? "default"
													: "outline"
											}
											size="sm"
											onClick={() =>
												setSentenceSortBy("anvaya")
											}
										>
											Show Pada-cchedaḥ
										</Button>
										<Button
											variant={
												sentenceSortBy === "poem"
													? "default"
													: "outline"
											}
											size="sm"
											onClick={() =>
												setSentenceSortBy("poem")
											}
										>
											Show Anvaya
										</Button>
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-2">
								{sentences.map((s) => (
									<div key={s.sentno} className="text-sm">
										<span className="font-medium mr-2">
											S{s.sentno}:
										</span>
										<span>{s.text || "-"}</span>
									</div>
								))}
							</CardContent>
						</Card>
					);
				})()}

				<div className="flex w-full flex-wrap justify-end gap-2">
					{renderAddRowButton()}

					{/* Undo History Button */}
					{deletedRowsHistory.length > 0 && (
						<Popover>
							<PopoverTrigger asChild>
								<Button variant="outline" className="relative">
									<History className="size-4 mr-2" />
									Undo History
									<span className="ml-2 bg-primary text-primary-foreground rounded-full size-5 text-xs flex items-center justify-center">
										{deletedRowsHistory.length}
									</span>
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-96">
								<div className="space-y-2">
									<h4 className="font-semibold text-sm flex items-center gap-2">
										<Clock className="size-4" />
										Recent Deletions (24h window)
									</h4>
									<div className="max-h-96 overflow-y-auto space-y-2">
										{deletedRowsHistory.map(
											(entry, idx) => {
												const timeAgo = Math.floor(
													(Date.now() -
														entry.timestamp) /
														1000
												);
												const timeRemaining =
													Math.floor(
														(UNDO_TIME_LIMIT -
															(Date.now() -
																entry.timestamp)) /
															1000
													);

												return (
													<div
														key={entry.timestamp}
														className="p-3 border rounded-md bg-muted/50 space-y-2"
													>
														<div className="flex justify-between items-start">
															<div className="text-sm space-y-1">
																<div className="font-medium">
																	Row{" "}
																	{
																		entry
																			.deletedRow
																			?.anvaya_no
																	}{" "}
																	- "
																	{
																		entry
																			.deletedRow
																			?.word
																	}
																	"
																</div>
																<div className="text-xs text-muted-foreground">
																	Sentence #
																	{
																		entry
																			.deletedRow
																			?.sentno
																	}
																</div>
																<div className="text-xs text-muted-foreground">
																	{timeAgo <
																	60
																		? `${timeAgo}s ago`
																		: timeAgo <
																		  3600
																		? `${Math.floor(
																				timeAgo /
																					60
																		  )}m ago`
																		: `${Math.floor(
																				timeAgo /
																					3600
																		  )}h ago`}
																	{entry.affectedRows &&
																		entry
																			.affectedRows
																			.length >
																			0 && (
																			<span className="ml-2">
																				(+
																				{
																					entry
																						.affectedRows
																						.length
																				}{" "}
																				rows
																				affected)
																			</span>
																		)}
																</div>
															</div>
															<Button
																size="sm"
																variant="default"
																onClick={() =>
																	handleUndoDelete(
																		entry
																	)
																}
																className="shrink-0"
															>
																<Undo2 className="size-3 mr-1" />
																Undo
															</Button>
														</div>
														<div className="text-xs text-muted-foreground">
															Expires in:{" "}
															{timeRemaining < 60
																? `${timeRemaining}s`
																: timeRemaining <
																  3600
																? `${Math.floor(
																		timeRemaining /
																			60
																  )}m`
																: `${Math.floor(
																		timeRemaining /
																			3600
																  )}h`}
														</div>
													</div>
												);
											}
										)}
									</div>
								</div>
							</PopoverContent>
						</Popover>
					)}

					<Button
						onClick={handleRefresh}
						className="justify-center"
						variant="outline"
						disabled={loading}
					>
						Refresh
					</Button>
					<Button
						onClick={handleSortByIndex}
						className="justify-center"
						variant="outline"
					>
						Sort by Index {indexSortDirection === "asc" ? "↑" : "↓"}
					</Button>
					<Button
						onClick={handleSortByProseIndex}
						className="justify-center"
						variant="outline"
					>
						Sort by Prose Index{" "}
						{sortDirection === "asc" ? "↑" : "↓"}
					</Button>

					{/* Split and Join Sentence Buttons */}
					{isFieldEditable("word") && (
						<>
							<Button
								onClick={() => setOpenDialog("splitSentence")}
								className="justify-center"
								variant="outline"
							>
								<Split className="size-4 mr-2" />
								Split Sentence
							</Button>
							<Button
								onClick={() => setOpenDialog("joinSentences")}
								className="justify-center"
								variant="outline"
							>
								<Merge className="size-4 mr-2" />
								Join Sentences
							</Button>
						</>
					)}

					{changedRows.size > 1 && (
						<Button
							onClick={handleSaveAll}
							className="w-5rem justify-center"
						>
							Save All
						</Button>
					)}
				</div>
				{/* Main Content */}
				<div className="rounded-lg border bg-card shadow-sm">
					<div className="w-full overflow-x-auto">
						<Table className="min-w-[900px]">
							<TableHeader>
								<TableRow className="bg-muted/50">
									{selectedColumns.includes("index") && (
										<TableHead className="w-[100px]">
											Index
										</TableHead>
									)}
									{selectedColumns.includes("word") && (
										<TableHead>Word</TableHead>
									)}
									{selectedColumns.includes("poem") && (
										<TableHead>Prose Index</TableHead>
									)}
									{selectedColumns.includes(
										"sandhied_word"
									) && <TableHead>Sandhied Word</TableHead>}
									{selectedColumns.includes(
										"morph_analysis"
									) && <TableHead>Morph Analysis</TableHead>}
									{selectedColumns.includes(
										"morph_in_context"
									) && (
										<TableHead>Morph In Context</TableHead>
									)}
									{selectedColumns.includes(
										"kaaraka_sambandha"
									) && (
										<TableHead>Kaaraka Relation</TableHead>
									)}
									{selectedColumns.includes(
										"possible_relations"
									) && (
										<TableHead>
											Possible Relations
										</TableHead>
									)}
									{selectedColumns.includes(
										"hindi_meaning"
									) && <TableHead>Hindi Meaning</TableHead>}
									{selectedColumns.includes(
										"english_meaning"
									) && <TableHead>English Meaning</TableHead>}
									{/* Render dynamic language column headers */}
									{availableLanguages.map((lang) => {
										const columnId = `meaning_${lang.code}`;
										if (!selectedColumns.includes(columnId))
											return null;
										return (
											<TableHead key={columnId}>
												{lang.name} Meaning
											</TableHead>
										);
									})}
									{selectedColumns.includes("bgcolor") && (
										<TableHead>Color Code</TableHead>
									)}
									{isFieldEditable("word") && (
										<TableHead className="w-[100px]">
											Actions
										</TableHead>
									)}
								</TableRow>
							</TableHeader>
							{renderTableContent()}
						</Table>
					</div>
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

				<Dialog
					open={openDialog === "deleteRow"}
					onOpenChange={(open) =>
						setOpenDialog(open ? "deleteRow" : null)
					}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Confirm Deletion</DialogTitle>
							<DialogDescription>
								Are you sure you want to delete this row? This
								action cannot be undone.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setOpenDialog(null)}
								disabled={isDeletingRow}
							>
								Cancel
							</Button>
							<Button
								variant="destructive"
								onClick={confirmDelete}
								disabled={isDeletingRow}
							>
								{isDeletingRow ? "Deleting..." : "Delete"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{renderAddRowDialog()}

				<Dialog
					open={openDialog === "meaning"}
					onOpenChange={(open) =>
						setOpenDialog(open ? "meaning" : null)
					}
				>
					<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Complete Meaning</DialogTitle>
						</DialogHeader>
						<div className="space-y-4">
							{selectedWordMeaning
								.split(/(?=\d+\.)/)
								.map((part, index) => (
									<p key={index} className="text-sm">
										{part.trim()}
									</p>
								))}
						</div>
						<DialogFooter>
							<Button onClick={() => setOpenDialog(null)}>
								Close
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{renderDeleteAnalysisDialog()}

				{/* Split Sentence Dialog */}
				<Dialog
					open={openDialog === "splitSentence"}
					onOpenChange={(open) => {
						if (!open) {
							setSelectedRowsForSplit(new Set());
							setNewSentnoForSplit("");
						}
						setOpenDialog(open ? "splitSentence" : null);
					}}
				>
					<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Split Sentence</DialogTitle>
							<DialogDescription>
								Select rows to move to a new sentence number
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">
									New Sentence Number *
								</label>
								<Input
									type="text"
									value={newSentnoForSplit}
									onChange={(e) =>
										setNewSentnoForSplit(e.target.value)
									}
									placeholder="e.g., 3"
								/>
							</div>

							<div className="border rounded-lg max-h-96 overflow-y-auto">
								<div className="p-3 bg-muted font-semibold sticky top-0">
									Select Rows to Split
								</div>
								{Object.entries(
									updatedData.reduce((acc: any, row, idx) => {
										const sentno = String(row.sentno);
										if (!acc[sentno]) acc[sentno] = [];
										acc[sentno].push({ row, idx });
										return acc;
									}, {})
								).map(([sentno, rows]: [string, any]) => (
									<div key={sentno} className="border-t">
										<div className="p-2 bg-muted/50 font-medium text-sm">
											Sentence #{sentno}
										</div>
										{rows.map(({ row, idx }: any) => (
											<div
												key={idx}
												className="flex items-center gap-3 p-2 hover:bg-muted/30"
											>
												<Checkbox
													checked={selectedRowsForSplit.has(
														idx
													)}
													onCheckedChange={(
														checked
													) => {
														setSelectedRowsForSplit(
															(prev) => {
																const newSet =
																	new Set(
																		prev
																	);
																if (checked) {
																	newSet.add(
																		idx
																	);
																} else {
																	newSet.delete(
																		idx
																	);
																}
																return newSet;
															}
														);
													}}
												/>
												<div className="flex-1 text-sm">
													<span className="font-medium">
														{row.anvaya_no}
													</span>
													{" - "}
													<span>{row.word}</span>{" "}
													<span className="text-muted-foreground">
														({row.morph_in_context})
													</span>
												</div>
											</div>
										))}
									</div>
								))}
							</div>

							<div className="text-sm text-muted-foreground">
								Selected: {selectedRowsForSplit.size} row(s)
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setOpenDialog(null)}
								disabled={isSplitting}
							>
								Cancel
							</Button>
							<Button
								onClick={handleSplitSentence}
								disabled={
									isSplitting ||
									selectedRowsForSplit.size === 0
								}
							>
								{isSplitting ? (
									<>
										<Loader2 className="size-4 animate-spin mr-2" />
										Splitting...
									</>
								) : (
									<>
										<Split className="size-4 mr-2" />
										Split Sentence
									</>
								)}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* Join Sentences Dialog */}
				<Dialog
					open={openDialog === "joinSentences"}
					onOpenChange={(open) => {
						if (!open) {
							setSelectedSentnosForJoin([]);
							setTargetSentnoForJoin("");
						}
						setOpenDialog(open ? "joinSentences" : null);
					}}
				>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>Join Sentences</DialogTitle>
							<DialogDescription>
								Select 2 sentences to merge into one
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div className="border rounded-lg max-h-96 overflow-y-auto">
								<div className="p-3 bg-muted font-semibold sticky top-0">
									Select Sentences to Join (select exactly 2)
								</div>
								{Object.entries(
									updatedData.reduce((acc: any, row) => {
										const sentno = String(row.sentno);
										if (!acc[sentno]) {
											acc[sentno] = {
												count: 0,
												words: [],
											};
										}
										acc[sentno].count++;
										if (acc[sentno].words.length < 5) {
											acc[sentno].words.push(row.word);
										}
										return acc;
									}, {})
								).map(([sentno, data]: [string, any]) => (
									<div
										key={sentno}
										className="flex items-center gap-3 p-3 hover:bg-muted/30 border-t"
									>
										<Checkbox
											checked={selectedSentnosForJoin.includes(
												sentno
											)}
											onCheckedChange={(checked) => {
												setSelectedSentnosForJoin(
													(prev) => {
														if (checked) {
															if (
																prev.length < 2
															) {
																return [
																	...prev,
																	sentno,
																];
															}
															return prev;
														} else {
															return prev.filter(
																(s) =>
																	s !== sentno
															);
														}
													}
												);
											}}
											disabled={
												selectedSentnosForJoin.length >=
													2 &&
												!selectedSentnosForJoin.includes(
													sentno
												)
											}
										/>
										<div className="flex-1">
											<div className="font-medium">
												Sentence #{sentno}
											</div>
											<div className="text-sm text-muted-foreground">
												{data.count} rows:{" "}
												{data.words.join(" ")}
												{data.count > 5 && "..."}
											</div>
										</div>
									</div>
								))}
							</div>

							{selectedSentnosForJoin.length === 2 && (
								<div className="space-y-2">
									<label className="text-sm font-medium">
										Target Sentence Number *
									</label>
									<Select
										value={targetSentnoForJoin}
										onValueChange={setTargetSentnoForJoin}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select target sentence" />
										</SelectTrigger>
										<SelectContent>
											{selectedSentnosForJoin.map(
												(sentno) => (
													<SelectItem
														key={sentno}
														value={sentno}
													>
														Sentence #{sentno}
													</SelectItem>
												)
											)}
										</SelectContent>
									</Select>
									<p className="text-xs text-muted-foreground">
										All rows will be moved to this sentence
										number
									</p>
								</div>
							)}

							<div className="text-sm text-muted-foreground">
								Selected: {selectedSentnosForJoin.length} / 2
								sentences
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setOpenDialog(null)}
								disabled={isJoining}
							>
								Cancel
							</Button>
							<Button
								onClick={handleJoinSentences}
								disabled={
									isJoining ||
									selectedSentnosForJoin.length !== 2 ||
									!targetSentnoForJoin
								}
							>
								{isJoining ? (
									<>
										<Loader2 className="size-4 animate-spin mr-2" />
										Joining...
									</>
								) : (
									<>
										<Merge className="size-4 mr-2" />
										Join Sentences
									</>
								)}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<Card className="mt-6 md:mt-8" id="discussions">
					<CardHeader>
						<CardTitle>Discussions</CardTitle>
					</CardHeader>
					<CardContent>
						<Discussions shlokaId={shloka._id} />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
const hexToRgb = (hex: string) => {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
				result[3],
				16
		  )}`
		: "0, 0, 0";
};
