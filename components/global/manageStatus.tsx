"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Book {
	book: string;
	userPublished: boolean;
	groupPublished: boolean;
	shlokaCount: number;
	locked?: boolean;
}

interface Chapter {
	book: string;
	part1: string | null;
	part2: string | null;
	chaptno: string; // Changed from number | string to just string
	userPublished: boolean;
	groupPublished: boolean;
	shlokaCount: number;
	locked?: boolean;
}

interface StatusData {
	books: Book[];
	chapters: Chapter[];
}

export default function BookPublishPage() {
	const { isSignedIn } = useAuth();
	const [data, setData] = useState<StatusData>({ books: [], chapters: [] });
	const [isLoading, setIsLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedBook, setSelectedBook] = useState<string>("all");
	const [activeTab, setActiveTab] = useState("books");

	useEffect(() => {
		if (isSignedIn) {
			fetchData();
		}
	}, [isSignedIn]);

	const fetchData = async () => {
		try {
			const response = await fetch("/api/books/status");
			if (!response.ok) throw new Error("Failed to fetch data");
			const data = await response.json();
			setData(data);
		} catch (error) {
			console.error("Error fetching data:", error);
			toast.error("Failed to load data");
		} finally {
			setIsLoading(false);
		}
	};

	const handleBookPublishChange = async (book: string, field: "userPublished" | "groupPublished", value: boolean) => {
		try {
			const response = await fetch("/api/books/publish", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					book,
					[field]: value,
				}),
			});

			if (!response.ok) throw new Error("Failed to update publishing status");

			const responseData = await response.json();
			toast.success(responseData.message);

			// Update only the book-level state, not chapters
			setData((prevData) => ({
				...prevData,
				books: prevData.books.map((b) => (b.book === book ? { ...b, [field]: value } : b)),
			}));
		} catch (error) {
			console.error("Error updating publishing status:", error);
			toast.error("Failed to update publishing status");
		}
	};

	const handleChapterPublishChange = async (chapter: Chapter, field: "userPublished" | "groupPublished", value: boolean) => {
		try {
			const requestBody = {
				book: chapter.book,
				part1: chapter.part1,
				part2: chapter.part2,
				chaptno: chapter.chaptno,
				[field]: value,
			};

			console.log("Sending chapter publish request:", requestBody);

			const response = await fetch("/api/books/publish/chapter", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				const errorData = await response.json();
				console.error("Chapter publish error response:", errorData);
				throw new Error(errorData.error || "Failed to update publishing status");
			}

			const responseData = await response.json();
			toast.success(responseData.message);

			// Update the local state immediately
			setData((prevData) => ({
				...prevData,
				chapters: prevData.chapters.map((c) =>
					c.book === chapter.book && c.part1 === chapter.part1 && c.part2 === chapter.part2 && c.chaptno === chapter.chaptno ? { ...c, [field]: value } : c
				),
			}));
		} catch (error) {
			console.error("Error updating publishing status:", error);
			toast.error("Failed to update publishing status");
		}
	};

	const handleLockChange = async (book: string, locked: boolean) => {
		try {
			const response = await fetch("/api/books/lock", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					book,
					locked,
				}),
			});

			if (!response.ok) throw new Error("Failed to update lock status");

			const data = await response.json();
			toast.success(`Updated lock status for ${book}`);

			// Update only the book-level state, not chapters
			setData((prevData) => ({
				...prevData,
				books: prevData.books.map((b) => (b.book === book ? { ...b, locked } : b)),
			}));
		} catch (error) {
			console.error("Error updating lock status:", error);
			toast.error("Failed to update lock status");
		}
	};

	const filteredBooks = data.books.filter((book) => book.book.toLowerCase().includes(searchTerm.toLowerCase()));
	const filteredChapters = data.chapters.filter((chapter) => {
		const searchTerms = searchTerm
			.toLowerCase()
			.split(" ")
			.filter((term) => term.length > 0);

		// If no search terms, show all chapters
		if (searchTerms.length === 0) {
			const bookFilter = selectedBook === "all" || selectedBook === "" || chapter.book === selectedBook;
			const chaptnoValid = chapter.chaptno !== null;
			return bookFilter && chaptnoValid;
		}

		// Check if all search terms match any field
		const allTermsMatch = searchTerms.every((term) => {
			const bookMatch = chapter.book.toLowerCase().includes(term);
			const part1Match = chapter.part1?.toLowerCase().includes(term) || false;
			const part2Match = chapter.part2?.toLowerCase().includes(term) || false;
			const chaptnoMatch = chapter.chaptno.toLowerCase().includes(term);

			return bookMatch || part1Match || part2Match || chaptnoMatch;
		});

		const bookFilter = selectedBook === "all" || selectedBook === "" || chapter.book === selectedBook;
		const chaptnoValid = chapter.chaptno !== null;

		return allTermsMatch && bookFilter && chaptnoValid;
	});

	const uniqueBooks = Array.from(new Set(data.chapters.map((c) => c.book))).sort();

	// Function to check if a book is partially published
	const getBookPublishingStatus = (bookName: string) => {
		const bookChapters = data.chapters.filter((c) => c.book === bookName);
		if (bookChapters.length === 0) return { status: "no-chapters", userPublished: false, groupPublished: false };

		const totalChapters = bookChapters.length;
		const userPublishedChapters = bookChapters.filter((c) => c.userPublished).length;
		const groupPublishedChapters = bookChapters.filter((c) => c.groupPublished).length;

		const book = data.books.find((b) => b.book === bookName);
		const bookUserPublished = book?.userPublished || false;
		const bookGroupPublished = book?.groupPublished || false;

		// If book is published, all chapters are considered published
		if (bookUserPublished || bookGroupPublished) {
			return {
				status: "fully-published",
				userPublished: bookUserPublished,
				groupPublished: bookGroupPublished,
			};
		}

		// Check if some chapters are published but not all
		if (userPublishedChapters > 0 || groupPublishedChapters > 0) {
			return {
				status: "partially-published",
				userPublished: userPublishedChapters > 0,
				groupPublished: groupPublishedChapters > 0,
				userPublishedCount: userPublishedChapters,
				groupPublishedCount: groupPublishedChapters,
				totalChapters,
			};
		}

		return {
			status: "not-published",
			userPublished: false,
			groupPublished: false,
		};
	};

	if (!isSignedIn) {
		return (
			<div className="min-h-[75vh] bg-gradient-to-br from-slate-50 to-slate-100 p-8">
				<div className="max-w-4xl mx-auto space-y-6">
					<h2 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mb-8">
						Manage Book Publishing
					</h2>
					<div className="w-full max-w-2xl mx-auto backdrop-blur-sm bg-white/30 p-6 rounded-xl shadow-xl">
						<p className="text-center text-gray-600">Please sign in to manage book publishing.</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-4 space-y-8">
			<div className="pt-5">
				<CardTitle>Book Publishing Status</CardTitle>
				<CardDescription>Manage publishing and lock status for books and individual chapters</CardDescription>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="books">Book Level</TabsTrigger>
					<TabsTrigger value="chapters">Chapter Level</TabsTrigger>
				</TabsList>

				<TabsContent value="books" className="space-y-6">
					<div className="space-y-2">
						<Label>Search Books</Label>
						<Input placeholder="Search by book name" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
					</div>

					<ScrollArea className="h-[600px] rounded-md border p-4">
						<div className="space-y-4">
							{isLoading ? (
								<div className="flex justify-center items-center py-12">
									<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
								</div>
							) : filteredBooks.length === 0 ? (
								<div className="text-center text-gray-600 py-12">No books found</div>
							) : (
								filteredBooks.map((book) => {
									const publishingStatus = getBookPublishingStatus(book.book);
									return (
										<div key={book.book} className="flex items-center justify-between p-4 border rounded-md">
											<div className="space-y-1">
												<p className="font-medium">{book.book}</p>
												<p className="text-sm text-gray-500">{book.shlokaCount} shlokas</p>
												{publishingStatus.status === "partially-published" && (
													<div className="text-xs text-orange-600 dark:text-orange-400">
														Partially Published: {publishingStatus.userPublishedCount || 0} user-published, {publishingStatus.groupPublishedCount || 0}{" "}
														group-published out of {publishingStatus.totalChapters} chapters
													</div>
												)}
											</div>
											<div className="flex items-center space-x-4">
												<div className="flex items-center space-x-2">
													<Checkbox
														id={`user-${book.book}`}
														checked={book.userPublished}
														onCheckedChange={(checked) => handleBookPublishChange(book.book, "userPublished", checked as boolean)}
													/>
													<Label htmlFor={`user-${book.book}`} className="text-sm">
														User Published
													</Label>
												</div>
												<div className="flex items-center space-x-2">
													<Checkbox
														id={`group-${book.book}`}
														checked={book.groupPublished}
														onCheckedChange={(checked) => handleBookPublishChange(book.book, "groupPublished", checked as boolean)}
													/>
													<Label htmlFor={`group-${book.book}`} className="text-sm">
														Group Published
													</Label>
												</div>
												<div className="flex items-center space-x-2">
													<Checkbox
														id={`lock-${book.book}`}
														checked={book.locked}
														onCheckedChange={(checked) => handleLockChange(book.book, checked as boolean)}
														className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
													/>
													<Label htmlFor={`lock-${book.book}`} className="text-sm">
														Locked
													</Label>
												</div>
											</div>
										</div>
									);
								})
							)}
						</div>
					</ScrollArea>
				</TabsContent>

				<TabsContent value="chapters" className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Filter by Book</Label>
							<Select value={selectedBook} onValueChange={setSelectedBook}>
								<SelectTrigger>
									<SelectValue placeholder="All books" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All books</SelectItem>
									{uniqueBooks.map((book) => (
										<SelectItem key={book} value={book}>
											{book}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Search Chapters</Label>
							<Input
								placeholder="Search by book, part1, part2, or chapter number (use spaces for multiple terms)"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
					</div>

					<ScrollArea className="h-[600px] rounded-md border p-4">
						<div className="space-y-4">
							{isLoading ? (
								<div className="flex justify-center items-center py-12">
									<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
								</div>
							) : filteredChapters.length === 0 ? (
								<div className="text-center text-gray-600 py-12">
									{data.chapters.length === 0 ? "No chapters found" : "No chapters with proper structure found. Some books may not have chapter organization."}
								</div>
							) : (
								filteredChapters.map((chapter) => (
									<div
										key={`${chapter.book}-${chapter.part1}-${chapter.part2}-${chapter.chaptno}`}
										className="flex items-center justify-between p-4 border rounded-md"
									>
										<div className="space-y-1">
											<p className="font-medium">{chapter.book}</p>
											<p className="text-sm text-gray-500">
												Chapter: {chapter.part1 || "N/A"}/{chapter.part2 || "N/A"}/{chapter.chaptno} ({chapter.shlokaCount} shlokas)
											</p>
										</div>
										<div className="flex items-center space-x-4">
											<div className="flex items-center space-x-2">
												<Checkbox
													id={`user-chapter-${chapter.book}-${chapter.part1}-${chapter.part2}-${chapter.chaptno}`}
													checked={chapter.userPublished}
													onCheckedChange={(checked) => handleChapterPublishChange(chapter, "userPublished", checked as boolean)}
												/>
												<Label htmlFor={`user-chapter-${chapter.book}-${chapter.part1}-${chapter.part2}-${chapter.chaptno}`} className="text-sm">
													User Published
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<Checkbox
													id={`group-chapter-${chapter.book}-${chapter.part1}-${chapter.part2}-${chapter.chaptno}`}
													checked={chapter.groupPublished}
													onCheckedChange={(checked) => handleChapterPublishChange(chapter, "groupPublished", checked as boolean)}
												/>
												<Label htmlFor={`group-chapter-${chapter.book}-${chapter.part1}-${chapter.part2}-${chapter.chaptno}`} className="text-sm">
													Group Published
												</Label>
											</div>
										</div>
									</div>
								))
							)}
						</div>
					</ScrollArea>
				</TabsContent>
			</Tabs>
		</div>
	);
}
