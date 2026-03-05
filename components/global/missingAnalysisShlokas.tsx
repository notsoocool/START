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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Loader2, RefreshCw, ExternalLink, FileQuestion, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Shloka {
	_id: string;
	book: string;
	part1?: string | null;
	part2?: string | null;
	chaptno: string;
	slokano: string;
	spart: string;
}

interface BookOption {
	book: string;
}

export default function MissingAnalysisShlokas() {
	const router = useRouter();
	const [books, setBooks] = useState<BookOption[]>([]);
	const [selectedBook, setSelectedBook] = useState<string>("all");
	const [shlokas, setShlokas] = useState<Shloka[]>([]);
	const [loading, setLoading] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleteAllLoading, setDeleteAllLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState({
		total: 0,
		pages: 0,
		limit: 50,
	});

	const fetchBooks = async () => {
		try {
			const res = await fetch("/api/books");
			if (!res.ok) throw new Error("Failed to fetch books");
			const data = await res.json();
			const bookNames = Array.from(new Set((data || []).map((b: { book: string }) => b.book))) as string[];
			setBooks(bookNames.map((b) => ({ book: b })));
		} catch {
			toast.error("Failed to load books");
		}
	};

	const fetchMissingAnalysis = async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({ page: String(page), limit: "50" });
			if (selectedBook && selectedBook !== "all") params.set("book", selectedBook);
			const res = await fetch(`/api/admin/shlokas-missing-analysis?${params}`);
			if (!res.ok) throw new Error("Failed to fetch");
			const data = await res.json();
			setShlokas(data.shlokas || []);
			setPagination(data.pagination || { total: 0, pages: 0, limit: 50 });
		} catch {
			toast.error("Failed to load shlokas missing analysis");
			setShlokas([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBooks();
	}, []);

	useEffect(() => {
		fetchMissingAnalysis();
	}, [selectedBook, page]);

	const handleOpenShloka = (s: Shloka) => {
		const part1 = s.part1 ?? "null";
		const part2 = s.part2 ?? "null";
		const url = `/books/${encodeURIComponent(s.book)}/${encodeURIComponent(part1)}/${encodeURIComponent(part2)}/${encodeURIComponent(s.chaptno)}`;
		router.push(url);
	};

	const handleDeleteOne = async (s: Shloka, e: React.MouseEvent) => {
		e.stopPropagation();
		setDeletingId(s._id);
		try {
			const res = await fetch(`/api/ahShloka/${s._id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
				body: JSON.stringify({}),
			});
			if (res.ok) {
				toast.success("Shloka deleted");
				setShlokas((prev) => prev.filter((x) => x._id !== s._id));
				setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
			} else {
				const data = await res.json();
				toast.error(data.error || "Failed to delete");
			}
		} catch {
			toast.error("Failed to delete shloka");
		} finally {
			setDeletingId(null);
		}
	};

	const handleDeleteAll = async () => {
		setDeleteAllLoading(true);
		try {
			const params = new URLSearchParams();
			if (selectedBook && selectedBook !== "all") params.set("book", selectedBook);
			const res = await fetch(`/api/admin/shlokas-missing-analysis?${params.toString()}`, {
				method: "DELETE",
			});
			const data = await res.json();
			if (res.ok) {
				toast.success(data.message || `Deleted ${data.deletedCount} shloka(s)`);
				fetchMissingAnalysis();
			} else {
				toast.error(data.error || "Failed to delete");
			}
		} catch {
			toast.error("Failed to delete shlokas");
		} finally {
			setDeleteAllLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<CardTitle className="flex items-center gap-2">
							<FileQuestion className="h-5 w-5" />
							Shlokas Missing Analysis
						</CardTitle>
						<CardDescription>
							Find all shlokas that do not have any analysis data. Click a row to open the chapter and add analysis.
						</CardDescription>
					</div>
					<div className="flex items-center gap-2 flex-wrap">
						<Select value={selectedBook} onValueChange={(v) => { setSelectedBook(v); setPage(1); }}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Filter by book" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All books</SelectItem>
								{books.map((b) => (
									<SelectItem key={b.book} value={b.book}>
										{b.book}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button variant="outline" size="icon" onClick={fetchMissingAnalysis} disabled={loading}>
							<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
						</Button>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive" size="sm" disabled={pagination.total === 0 || deleteAllLoading}>
									{deleteAllLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
									Delete all
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete all shlokas missing analysis?</AlertDialogTitle>
									<AlertDialogDescription>
										This will permanently delete {pagination.total} shloka(s) that have no analysis.
										{selectedBook !== "all" && ` (Filtered by: ${selectedBook})`}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
										Delete all
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{loading && shlokas.length === 0 ? (
					<div className="flex justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : shlokas.length === 0 ? (
					<div className="text-center py-12 text-muted-foreground">
						<FileQuestion className="h-12 w-12 mx-auto mb-2 opacity-50" />
						<p>No shlokas missing analysis found.</p>
						{selectedBook !== "all" && (
							<p className="text-sm mt-1">Try selecting &quot;All books&quot; to see more.</p>
						)}
					</div>
				) : (
					<>
						<div className="text-sm text-muted-foreground mb-2">
							{pagination.total} shloka(s) missing analysis
						</div>
						<ScrollArea className="h-[400px] rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Book</TableHead>
										<TableHead>Part 1</TableHead>
										<TableHead>Part 2</TableHead>
										<TableHead>Chapter</TableHead>
										<TableHead>Shloka No.</TableHead>
										<TableHead className="w-[100px]">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{shlokas.map((s) => (
										<TableRow
											key={s._id}
											className="cursor-pointer hover:bg-muted/50"
											onClick={() => handleOpenShloka(s)}
										>
											<TableCell className="font-medium">{s.book}</TableCell>
											<TableCell>{s.part1 ?? "—"}</TableCell>
											<TableCell>{s.part2 ?? "—"}</TableCell>
											<TableCell>{s.chaptno}</TableCell>
											<TableCell>{s.slokano}</TableCell>
											<TableCell onClick={(e) => e.stopPropagation()} className="space-x-1">
												<Button variant="ghost" size="sm" onClick={() => handleOpenShloka(s)} title="Open">
													<ExternalLink className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={(e) => handleDeleteOne(s, e)}
													disabled={deletingId === s._id}
													className="text-destructive hover:text-destructive hover:bg-destructive/10"
													title="Delete"
												>
													{deletingId === s._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</ScrollArea>
						{pagination.pages > 1 && (
							<div className="flex items-center justify-between mt-4">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
								>
									Previous
								</Button>
								<span className="text-sm text-muted-foreground">
									Page {page} of {pagination.pages}
								</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
									disabled={page === pagination.pages}
								>
									Next
								</Button>
							</div>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
