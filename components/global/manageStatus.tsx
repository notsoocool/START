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

interface Book {
	book: string;
	userPublished: boolean;
	groupPublished: boolean;
	shlokaCount: number;
	locked?: boolean;
}

export default function BookPublishPage() {
	const { isSignedIn } = useAuth();
	const [books, setBooks] = useState<Book[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");

	useEffect(() => {
		if (isSignedIn) {
			fetchBooks();
		}
	}, [isSignedIn]);

	const fetchBooks = async () => {
		try {
			const response = await fetch("/api/books/status");
			if (!response.ok) throw new Error("Failed to fetch books");
			const data = await response.json();
			setBooks(data);
		} catch (error) {
			console.error("Error fetching books:", error);
			toast.error("Failed to load books");
		} finally {
			setIsLoading(false);
		}
	};

	const handlePublishChange = async (book: string, field: "userPublished" | "groupPublished", value: boolean) => {
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

			const data = await response.json();
			toast.success(`Updated ${data.modifiedCount} shlokas in ${book}`);

			// Update the local state immediately
			setBooks((prevBooks) => prevBooks.map((b) => (b.book === book ? { ...b, [field]: value } : b)));
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

			// Update the local state immediately
			setBooks((prevBooks) => prevBooks.map((b) => (b.book === book ? { ...b, locked } : b)));
		} catch (error) {
			console.error("Error updating lock status:", error);
			toast.error("Failed to update lock status");
		}
	};

	const filteredBooks = books.filter((book) => book.book.toLowerCase().includes(searchTerm.toLowerCase()));

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

		
				<div className=" pt-5">
					<CardTitle>Book Publishing Status</CardTitle>
					<CardDescription>Manage publishing and lock status for entire books</CardDescription>
				</div>
				<div>
					<div className="space-y-6">
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
									filteredBooks.map((book) => (
										<div key={book.book} className="flex items-center justify-between p-4 border rounded-md">
											<div className="space-y-1">
												<p className="font-medium">{book.book}</p>
												<p className="text-sm text-gray-500">{book.shlokaCount} shlokas</p>
											</div>
											<div className="flex items-center space-x-4">
												<div className="flex items-center space-x-2">
													<Checkbox
														id={`user-${book.book}`}
														checked={book.userPublished}
														onCheckedChange={(checked) => handlePublishChange(book.book, "userPublished", checked as boolean)}
													/>
													<Label htmlFor={`user-${book.book}`} className="text-sm">
														User Published
													</Label>
												</div>
												<div className="flex items-center space-x-2">
													<Checkbox
														id={`group-${book.book}`}
														checked={book.groupPublished}
														onCheckedChange={(checked) => handlePublishChange(book.book, "groupPublished", checked as boolean)}
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
									))
								)}
							</div>
						</ScrollArea>
					</div>
                    </div>
	
	
		</div>
	);
}
