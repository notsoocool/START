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
	book: "bg-purple-100 hover:bg-purple-200",
	subpart: "bg-blue-100 hover:bg-blue-200",
	"sub-subpart": "bg-green-100 hover:bg-green-200",
	chapter: "bg-yellow-100 hover:bg-yellow-200",
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
    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const response = await fetch("/api/books");
                const data = await response.json();
    
                const transformedData = data.map((book: any) => ({
                    id: book.book,
                    title: book.book,
                    type: "book",
                    children: book.part1 && book.part1.length > 0
                        ? book.part1
                            .map((part1: any) => {
                                // Case 1: If part1 and part2 are both null, render chapters directly under book
                                if (part1.part === null) {
                                    // Render chapters directly under book if part1 is null and part2 contains chapters
                                    return part1.part2.map((part2: any) => ({
                                        id: `${book.book}`,
                                        title: part2.part ,
                                        type: "sub-subpart",
                                        children: part2.chapters.map((chapter: string) => ({
                                            id: `${book.book}-chapter-${chapter}`,
                                            title: `Chapter ${chapter}`,
                                            type: "chapter",
                                        })),
                                    }));
                                }    
                                // Case 3: If both part1 and part2 exist, create subparts and sub-subparts
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
                        : book.chapters // If part1 doesn't exist, display chapters directly under the book
                            ? book.chapters.map((chapter: string) => ({
                                id: `${book.book}-chapter-${chapter}`,
                                title: `Chapter ${chapter}`,
                                type: "chapter",
                            }))
                            : [], // Fallback in case there are no chapters or part1
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
				<h2 className="text-3xl font-bold mb-6 text-center">Sacred Texts</h2>
				<div className="w-[30rem]">
					{books.map((book) => (
						<TreeNode key={book.id} item={book} />
					))}
				</div>
			</div>
		</div>
	);
}
