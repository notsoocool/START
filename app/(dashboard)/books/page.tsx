"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Book, Bookmark, FileText, ScrollText, Type } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
	book: "bg-purple-100 hover:bg-purple-200",
	subpart: "bg-blue-100 hover:bg-blue-200",
	"sub-subpart": "bg-green-100 hover:bg-green-200",
	chapter: "bg-yellow-100 hover:bg-yellow-200",
};

// Component to display each tree node and handle the expand/collapse state
// Inside TreeNode Component, update the click handler for chapters
// Inside TreeNode component
const TreeNode = ({
	item,
	level = 0,
	book,
	part1,
	part2,
}: {
	item: Item;
	level?: number;
	book?: string;
	part1?: string;
	part2?: string;
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const router = useRouter(); // Import this from 'next/navigation'

	const handleChapterClick = () => {
        if (item.type === 'chapter') {
          // Extract only the chapter number from the title (e.g., "01" from "Chapter 01")
          const chapterNumber = item.title.replace("Chapter ", "").trim();
          // Redirect to the shloka page with the selected book, part1, part2, and chapter number
          router.push(
            `/books/${book || 'null'}/${part1 || 'null'}/${part2 || 'null'}/${chapterNumber}`
          );
        }
      };

	const hasChildren = item.children && item.children.length > 0;
	const Icon = iconMap[item.type];

	return (
		<Card
			className={`mb-2 ${
				colorMap[item.type]
			} transition-colors duration-200`}
		>
			<CardContent className="p-2">
				<Button
					variant="ghost"
					className="w-full justify-start p-2 h-auto text-left"
					onClick={
						item.type === "chapter"
							? handleChapterClick
							: () => setIsOpen(!isOpen)
					}
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
							{item.children!.map((child) => (
								<TreeNode
									key={child.id}
									item={child}
									level={level + 1}
									book={
										book ||
										(item.type === "book"
											? item.title
											: undefined)
									}
									part1={
										part1 ||
										(item.type === "subpart"
											? item.title
											: undefined)
									}
									part2={
										part2 ||
										(item.type === "sub-subpart"
											? item.title
											: undefined)
									}
								/>
							))}
						</motion.div>
					)}
				</AnimatePresence>
			</CardContent>
		</Card>
	);
};

export default function SacredTexts() {
	const [books, setBooks] = useState<Item[]>([]);

	// Fetch books data on component mount
	useEffect(() => {
		const fetchBooks = async () => {
			try {
				const response = await fetch("/api/books");
				const data = await response.json();

				// Transform the fetched data into the required tree structure
				const transformedData = data.map((book: any) => ({
					id: book.book,
					title: book.book,
					type: "book",
					children: book.part1
						.map((part1: any) => {
							// If part1 is null, directly display chapters under the book
							if (part1.part === null) {
								return part1.chapters.map(
									(chapter: string) => ({
										id: `${book.book}-chapter-${chapter}`,
										title: `Chapter ${chapter}`,
										type: "chapter",
									})
								);
							}
							// If part2 is null, directly display chapters under part1
							return {
								id: `${book.book}-${part1.part}`,
								title: part1.part,
								type: "subpart",
								children: part1.part2
									.map((part2: any) => {
										if (part2.part === null) {
											return part2.chapters.map(
												(chapter: string) => ({
													id: `${book.book}-${part1.part}-chapter-${chapter}`,
													title: `Chapter ${chapter}`,
													type: "chapter",
												})
											);
										}
										// If part2 has a value, display chapters under part2
										return {
											id: `${book.book}-${part1.part}-${part2.part}`,
											title: part2.part,
											type: "sub-subpart",
											children: part2.chapters.map(
												(chapter: string) => ({
													id: `${book.book}-${part1.part}-${part2.part}-chapter-${chapter}`,
													title: `Chapter ${chapter}`,
													type: "chapter",
												})
											),
										};
									})
									.flat(), // Flatten in case of direct chapter array from null checks
							};
						})
						.flat(), // Flatten to handle direct chapters at book or part1 level
				}));

				setBooks(transformedData);
			} catch (error) {
				console.error("Error fetching books:", error);
			}
		};

		fetchBooks();
	}, []);

	return (
		<div className="w-full h-full p-4 bg-gradient-to-br">
			<div className="space-y-4">
				<h2 className="text-3xl font-bold mb-6 text-center">
					Sacred Texts
				</h2>
				<div className="w-[30rem]">
					{books.map((book) => (
						<TreeNode key={book.id} item={book} />
					))}
				</div>
			</div>
		</div>
	);
}
