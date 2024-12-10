"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Book, Bookmark, FileText, ScrollText, Type } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// Define the item types based on API response structure
type Item = {
	id: string;
	title: string;
	type: "book" | "subpart" | "sub-subpart" | "chapter";
	children?: Item[];
};

// Mapping the icons and colors to types
const iconMap = {
	book: Book,
	subpart: Bookmark,
	"sub-subpart": FileText,
	chapter: ScrollText,
};

const colorMap = {
	book: "bg-gradient-to-r from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 shadow-sm",
	subpart: "bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 shadow-sm",
	"sub-subpart": "bg-gradient-to-r from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 shadow-sm",
	chapter: "bg-gradient-to-r from-yellow-100 to-yellow-200 hover:from-yellow-200 hover:to-yellow-300 shadow-sm",
};

// Component to display each tree node and handle the expand/collapse state
// Inside TreeNode Component, update the click handler for chapters
// Inside TreeNode component
const TreeNode = ({ item, level = 0, book, part1, part2 }: { item: Item; level?: number; book?: string; part1?: string; part2?: string }) => {
	const [isOpen, setIsOpen] = useState(false);
	const router = useRouter(); // Import this from 'next/navigation'

	const handleChapterClick = () => {
		if (item.type === "chapter") {
			const chapterNumber = item.title.replace("Chapter ", "").trim();
			router.push(`/books/${book || "null"}/${part1 || "null"}/${part2 || "null"}/${chapterNumber}`);
		}
	};

	const hasChildren = item.children && item.children.length > 0;
	const Icon = iconMap[item.type];

	// Don't render if there are no children and it's not a chapter
	if (!hasChildren && item.type !== "chapter") return null;

	return (
		<Card className={`mb-2 ${colorMap[item.type]} transition-colors duration-200`}>
			<CardContent className="p-2">
				<Button
					variant="ghost"
					className="w-full justify-start p-2 h-auto text-left"
					onClick={item.type === "chapter" ? handleChapterClick : () => setIsOpen(!isOpen)}
				>
					<Icon className="mr-2 h-5 w-5" />
					<span className="font-medium">{item.title}</span>
				</Button>
				<AnimatePresence>
					{isOpen && hasChildren && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.3 }}
							className="ml-4 mt-2"
						>
							{item.children?.map((child) => {
								if (child && child.id) {
									return (
										<TreeNode
											key={child.id}
											item={child}
											level={level + 1}
											book={book || (item.type === "book" ? item.title : undefined)}
											part1={part1 || (item.type === "subpart" ? item.title : undefined)}
											part2={part2 || (item.type === "sub-subpart" ? item.title : undefined)}
										/>
									);
								}
								return null;
							})}
						</motion.div>
					)}
				</AnimatePresence>
			</CardContent>
		</Card>
	);
};

export default function SacredTexts() {
	const [books, setBooks] = useState<Item[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchBooks = async () => {
			try {
				setIsLoading(true);
				const response = await fetch("/api/books");
				const data = await response.json();

				const transformedData = data.map((book: any) => ({
					id: book.book,
					title: book.book,
					type: "book",
					children: book.part1 && book.part1.length > 0
						? book.part1
							.map((part1: any) => {
								// Case 1: If part1 is null, return chapters directly
								if (part1.part === null) {
									return part1.part2[0].chapters.map((chapter: string) => ({
										id: `${book.book}-chapter-${chapter}`,
										title: `Chapter ${chapter}`,
										type: "chapter",
									}));
								}    
								// Case 2: If both part1 and part2 exist...
								return {
									id: `${book.book}-${part1.part}`,
									title: part1.part,
									type: "subpart",
									children: part1.part2.map((part2: any) => ({
											id: `${book.book}-${part1.part}-${part2.part}`,
											title: part2.part,
											type: "sub-subpart",
											children: part2.chapters.map((chapter: string) => ({
												id: `${book.book}-${part1.part}-${part2.part}-chapter-${chapter}`,
												title: `Chapter ${chapter}`,
												type: "chapter",
											})),
										}))
										.flat(), // Flatten the array if part2 contains nested chapters
								};
							})
							.flat() // Flatten the array if part1 contains nested parts
						: book.chapters // This case handles books with direct chapters
							? book.chapters.map((chapter: string) => ({
								id: `${book.book}-chapter-${chapter}`,
								title: `Chapter ${chapter}`,
								type: "chapter",
							}))
							: [], 
				}));

				setBooks(transformedData);
			} catch (error) {
				console.error("Error fetching books:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchBooks();
	}, []);

	return (
		<div className="min-h-[75vh] bg-gradient-to-br from-slate-50 to-slate-100 p-8">
			<div className="max-w-4xl mx-auto space-y-6">
				<h2 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mb-8">
					Sacred Texts
				</h2>
				<div className="w-full max-w-2xl mx-auto backdrop-blur-sm bg-white/30 p-6 rounded-xl shadow-xl">
					{isLoading ? (
						<div className="flex justify-center items-center py-12">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
						</div>
					) : (
						books.map((book) => (
							<TreeNode key={book.id} item={book} />
						))
					)}
				</div>
			</div>
		</div>
	);
}
