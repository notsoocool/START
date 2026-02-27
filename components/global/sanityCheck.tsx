"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const SANITY_ERRORS_KEY = "sanity-check-errors";

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

interface SanityError {
	slokano?: string;
	sentno?: string;
	anvaya_no?: string;
	message: string;
}

interface SanityResult {
	errors: SanityError[];
	valid: boolean;
	totalRows: number;
}

export default function SanityCheck() {
	const router = useRouter();
	const [books, setBooks] = useState<Book[]>([]);
	const [selectedBook, setSelectedBook] = useState<string>("");
	const [selectedPart1, setSelectedPart1] = useState<string>("");
	const [selectedPart2, setSelectedPart2] = useState<string>("");
	const [selectedChapter, setSelectedChapter] = useState<string>("");
	const [availablePart1s, setAvailablePart1s] = useState<string[]>([]);
	const [availablePart2s, setAvailablePart2s] = useState<string[]>([]);
	const [availableChapters, setAvailableChapters] = useState<string[]>([]);
	const [isRunning, setIsRunning] = useState(false);
	const [result, setResult] = useState<SanityResult | null>(null);

	useEffect(() => {
		fetch("/api/books")
			.then((r) => r.json())
			.then(setBooks)
			.catch(() => toast.error("Failed to load books"));
	}, []);

	useEffect(() => {
		if (!selectedBook || selectedBook === "all") {
			setAvailablePart1s([]);
			setSelectedPart1("");
			setSelectedPart2("");
			setSelectedChapter("");
			return;
		}
		const book = books.find((b) => b.book === selectedBook);
		if (book) {
			const part1s = book.part1
				.map((p) => p.part)
				.map((p) => (p === null ? "none" : p)) as string[];
			setAvailablePart1s(["all", ...part1s]);
			setSelectedPart1(part1s.some((p) => p !== "none") ? "" : "none");
			setSelectedPart2("");
			setSelectedChapter("");
		}
	}, [selectedBook, books]);

	// Update part2 when part1 changes (part1 can be "none" when null)
	useEffect(() => {
		if (!selectedBook || selectedBook === "all" || !selectedPart1 || selectedPart1 === "all") return;
		const book = books.find((b) => b.book === selectedBook);
		if (book) {
			const part1 = book.part1.find(
				(p) => p.part === (selectedPart1 === "none" ? null : selectedPart1)
			);
			if (part1) {
				const part2s = part1.part2
					.map((p) => p.part)
					.map((p) => (p === null ? "none" : p)) as string[];
				setAvailablePart2s(part2s.some((p) => p !== "none") ? ["all", ...part2s] : part2s);
				setSelectedPart2(part2s.some((p) => p !== "none") ? "" : part2s.includes("none") ? "none" : "");
				setSelectedChapter("");
			} else {
				setAvailablePart2s([]);
				setSelectedPart2("");
			}
		}
	}, [selectedBook, selectedPart1, books]);

	// Update chapters when part2 changes (part2 can be "none" when null; chapter always exists)
	useEffect(() => {
		if (
			!selectedBook ||
			selectedBook === "all" ||
			!selectedPart1 ||
			!selectedPart2 ||
			selectedPart1 === "all" ||
			selectedPart2 === "all"
		)
			return;
		const book = books.find((b) => b.book === selectedBook);
		if (book) {
			const part1 = book.part1.find(
				(p) => p.part === (selectedPart1 === "none" ? null : selectedPart1)
			);
			if (part1) {
				const part2 = part1.part2.find(
					(p) => p.part === (selectedPart2 === "none" ? null : selectedPart2)
				);
				if (part2) {
					setAvailableChapters(part2.chapters?.length ? ["all", ...part2.chapters] : []);
					setSelectedChapter(part2.chapters?.length ? "" : "");
				} else {
					setAvailableChapters([]);
				}
			}
		}
	}, [selectedBook, selectedPart1, selectedPart2, books]);

	const runCheck = async () => {
		if (!selectedBook || selectedBook === "all") {
			toast.error("Select a book");
			return;
		}
		if (!selectedPart1) {
			toast.error("Select Part 1");
			return;
		}
		if (
			selectedPart1 !== "all" &&
			selectedPart1 !== "none" &&
			selectedPart2 === ""
		) {
			toast.error("Select Part 2");
			return;
		}
		if (
			selectedPart2 &&
			selectedPart2 !== "all" &&
			selectedPart2 !== "none" &&
			selectedChapter === ""
		) {
			toast.error("Select Chapter");
			return;
		}

		setIsRunning(true);
		setResult(null);
		try {
			const res = await fetch("/api/sanity-check", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					book: selectedBook,
					part1:
						selectedPart1 === "all"
							? "all"
							: selectedPart1 === "none"
							? "null"
							: selectedPart1,
					part2:
						!selectedPart2 || selectedPart2 === "all"
							? "all"
							: selectedPart2 === "none"
							? "null"
							: selectedPart2,
					chaptno:
						!selectedChapter || selectedChapter === "all"
							? "all"
							: selectedChapter,
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || "Sanity check failed");
			}
			const data: SanityResult = await res.json();
			setResult(data);
			if (data.valid) {
				toast.success(`All ${data.totalRows} rows passed sanity check`);
			} else {
				toast.error(`${data.errors.length} error(s) found`);
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Sanity check failed");
		} finally {
			setIsRunning(false);
		}
	};

	const handleErrorClick = async (err: SanityError) => {
		if (!err.slokano || !selectedBook || !selectedChapter || selectedChapter === "all") {
			if (!err.slokano) toast.info("Cannot navigate: this error has no slokano");
			else toast.info("Select a specific chapter to navigate to errors");
			return;
		}
		const part1Param = selectedPart1 === "all" || !selectedPart1 ? "null" : selectedPart1 === "none" ? "null" : selectedPart1;
		const part2Param = selectedPart2 === "all" || !selectedPart2 ? "null" : selectedPart2 === "none" ? "null" : selectedPart2;
		if (selectedPart1 === "all" || selectedPart2 === "all") {
			toast.info("Select specific Part 1 and Part 2 to navigate to errors");
			return;
		}
		try {
			const res = await fetch(
				`/api/books/${encodeURIComponent(selectedBook)}/${part1Param}/${part2Param}/${encodeURIComponent(selectedChapter)}`
			);
			if (!res.ok) throw new Error("Failed to fetch shlokas");
			const { shlokas } = await res.json();
			const errSlok = String(err.slokano ?? "").trim();
			const shloka = shlokas?.find((s: { slokano: string }) => {
				const sSlok = String(s.slokano ?? "").trim();
				return sSlok === errSlok || sSlok.padStart(3, "0") === errSlok.padStart(3, "0") || String(parseInt(sSlok, 10)) === String(parseInt(errSlok, 10));
			});
			if (!shloka) {
				toast.error(`Shloka not found for slokano "${err.slokano}"`);
				return;
			}
			// Store under specific key and a "latest" key (fallback for lookup)
			const storageKey = `${SANITY_ERRORS_KEY}-${selectedBook}-${part1Param}-${part2Param}-${selectedChapter}`;
			const errors = result?.errors ?? [];
			sessionStorage.setItem(storageKey, JSON.stringify(errors));
			sessionStorage.setItem(`${SANITY_ERRORS_KEY}-latest`, JSON.stringify({
				book: selectedBook,
				part1: part1Param,
				part2: part2Param,
				chaptno: selectedChapter,
				errors,
			}));
			const url = `/books/${encodeURIComponent(selectedBook)}/${encodeURIComponent(part1Param)}/${encodeURIComponent(part2Param)}/${encodeURIComponent(selectedChapter)}/${shloka._id}?fromSanity=1`;
			router.push(url);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to navigate");
		}
	};

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Sanity Check</CardTitle>
					<CardDescription>
						Validate analysis data for kaaraka_sambandha, morph_in_context,
						bgcolor, and related fields. Select scope and run the check.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<div>
							<label className="mb-1 block text-sm font-medium">Book</label>
							<Select
								value={selectedBook}
								onValueChange={(v) => {
									setSelectedBook(v);
									setResult(null);
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select book" />
								</SelectTrigger>
								<SelectContent>
									{books.map((b) => (
										<SelectItem key={b.book} value={b.book}>
											{b.book}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="mb-1 block text-sm font-medium">Part 1</label>
							<Select
								value={selectedPart1}
								onValueChange={(v) => {
									setSelectedPart1(v);
									setResult(null);
								}}
								disabled={!selectedBook || selectedBook === "all"}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select part 1" />
								</SelectTrigger>
								<SelectContent>
									{availablePart1s.map((p) => (
										<SelectItem key={p} value={p}>
											{p === "none" ? "None" : p}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="mb-1 block text-sm font-medium">Part 2</label>
							<Select
								value={selectedPart2}
								onValueChange={(v) => {
									setSelectedPart2(v);
									setResult(null);
								}}
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
									{availablePart2s.map((p) => (
										<SelectItem key={p} value={p}>
											{p === "none" ? "None" : p}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="mb-1 block text-sm font-medium">Chapter</label>
							<Select
								value={selectedChapter}
								onValueChange={(v) => {
									setSelectedChapter(v);
									setResult(null);
								}}
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
									{availableChapters.map((c) => (
										<SelectItem key={c} value={c}>
											{c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<Button onClick={runCheck} disabled={isRunning}>
						{isRunning ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Running...
							</>
						) : (
							"Run Sanity Check"
						)}
					</Button>
				</CardContent>
			</Card>

			{result && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg">Results</CardTitle>
							<div className="flex items-center gap-2">
								{result.valid ? (
									<Badge variant="default" className="bg-green-600">
										<CheckCircle2 className="mr-1 h-3 w-3" />
										Passed
									</Badge>
								) : (
									<Badge variant="destructive">
										<XCircle className="mr-1 h-3 w-3" />
										{result.errors.length} error(s)
									</Badge>
								)}
								<span className="text-sm text-muted-foreground">
									{result.totalRows} rows checked
								</span>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{result.errors.length > 0 ? (
							<ScrollArea className="h-[400px] rounded-md border">
								<div className="p-4 space-y-2">
									{result.errors.map((err, idx) => (
										<div
											key={idx}
											onClick={() => handleErrorClick(err)}
											className={`flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
												err.slokano && selectedChapter && selectedChapter !== "all"
													? "cursor-pointer hover:bg-muted/60"
													: ""
											}`}
										>
											<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
											<div className="flex-1 min-w-0">
												<div className="flex flex-wrap gap-2 mb-1">
													{err.slokano != null && err.slokano !== "" && (
														<Badge variant="outline">
															slokano: {err.slokano}
														</Badge>
													)}
													{err.sentno != null && err.sentno !== "" && (
														<Badge variant="outline">
															sentno: {err.sentno}
														</Badge>
													)}
													{err.anvaya_no != null && err.anvaya_no !== "" && (
														<Badge variant="outline">
															anvaya: {err.anvaya_no}
														</Badge>
													)}
												</div>
												<p className="text-muted-foreground">{err.message}</p>
											</div>
										</div>
									))}
								</div>
							</ScrollArea>
						) : (
							<p className="text-muted-foreground">
								All validations passed. No issues found.
							</p>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
