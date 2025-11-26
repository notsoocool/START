"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	Book,
	Bookmark,
	FileText,
	ScrollText,
	Lock,
	Loader2,
	AlertCircle,
	User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useCurrentUser, useBooks } from "@/lib/hooks/use-api";
import { useQueryClient } from "@tanstack/react-query";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

// Define the item types based on API response structure
type Item = {
	id: string;
	title: string;
	type: "book" | "subpart" | "sub-subpart" | "chapter";
	children?: Item[];
	status?: {
		locked: boolean;
		userPublished?: boolean;
		groupPublished?: boolean;
		owner?: string | null;
	};
};

// Mapping the icons and colors to types
const iconMap = {
	book: Book,
	subpart: Bookmark,
	"sub-subpart": FileText,
	chapter: ScrollText,
};

const colorMap = {
	book: "bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-950 hover:from-purple-200 hover:to-purple-300 dark:hover:from-purple-800 dark:hover:to-purple-900 shadow-sm",
	subpart:
		"bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-950 hover:from-blue-200 hover:to-blue-300 dark:hover:from-blue-800 dark:hover:to-blue-900 shadow-sm",
	"sub-subpart":
		"bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900 dark:to-green-950 hover:from-green-200 hover:to-green-300 dark:hover:from-green-800 dark:hover:to-green-900 shadow-sm",
	chapter:
		"bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-950 hover:from-yellow-200 hover:to-yellow-300 dark:hover:from-yellow-800 dark:hover:to-yellow-900 shadow-sm",
};

// Component to display each tree node and handle the expand/collapse state
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
	const [showOwnerDialog, setShowOwnerDialog] = useState(false);
	const [ownerData, setOwnerData] = useState<any>(null);
	const [loadingOwner, setLoadingOwner] = useState(false);
	const [ownerName, setOwnerName] = useState<string | null>(null);
	const router = useRouter();
	const { data: currentUser } = useCurrentUser(); // Use the cached user data

	// Fetch owner name when component mounts if there's an owner
	useEffect(() => {
		if (
			item.status?.owner &&
			(currentUser?.perms === "Admin" || currentUser?.perms === "Root")
		) {
			const ownerId = item.status.owner;
			if (!ownerId) return;

			const fetchOwnerName = async () => {
				try {
					const response = await fetch(`/api/users?ids=${ownerId}`);
					if (response.ok) {
						const data = await response.json();
						const owner = data.users?.find(
							(u: any) => u.userID === ownerId
						);
						if (owner) {
							setOwnerName(owner.name);
						}
					}
				} catch (error) {
					console.error("Error fetching owner name:", error);
				}
			};
			fetchOwnerName();
		}
	}, [item.status?.owner, currentUser?.perms]);

	const handleOwnerClick = async (ownerId: string) => {
		if (!ownerId) return;
		setLoadingOwner(true);
		setShowOwnerDialog(true);
		try {
			const response = await fetch(`/api/users/${ownerId}/shlokas`);
			if (response.ok) {
				const data = await response.json();
				setOwnerData(data);
			} else {
				console.error("Failed to fetch owner data");
			}
		} catch (error) {
			console.error("Error fetching owner data:", error);
		} finally {
			setLoadingOwner(false);
		}
	};

	const handleChapterClick = () => {
		if (item.type === "chapter") {
			const chapterNumber = item.title.replace("Chapter ", "").trim();
			router.push(
				`/books/${book || "null"}/${part1 || "null"}/${
					part2 || "null"
				}/${chapterNumber}`
			);
		}
	};

	const hasChildren = item.children && item.children.length > 0;
	const Icon = iconMap[item.type];

	// Don't render if there are no children and it's not a chapter
	if (!hasChildren && item.type !== "chapter") return null;

	return (
		<Card
			className={`mb-2 ${
				colorMap[item.type]
			} transition-colors duration-500`}
		>
			<CardContent className="p-2">
				<div className="flex items-center justify-between">
					<Button
						variant="ghost"
						className="w-full justify-start p-2 h-auto text-left"
						onClick={
							item.type === "chapter"
								? handleChapterClick
								: () => setIsOpen(!isOpen)
						}
						data-navigate={
							item.type === "chapter" ? "true" : undefined
						}
					>
						<Icon className="mr-2 h-5 w-5" />
						<span className="font-medium flex flex-row w-full justify-between">
							<div>{item.title}</div>
							{item.type === "book" && item.status && (
								<div className="flex items-center gap-1 ml-2">
									{/* Locked indicator - only show to Admin/Root */}
									{item.status.locked &&
										(currentUser?.perms === "Admin" ||
											currentUser?.perms === "Root") && (
											<div className="relative group">
												<Lock className="h-4 w-4 text-red-500" />
												<span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-red-500 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
													Locked - Only Admin/Root
												</span>
											</div>
										)}

									{/* User Published indicator */}
									{item.status.userPublished && (
										<div className="relative group">
											<div className="h-2 w-2 bg-green-500 rounded-full" />
											<span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-green-500 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
												User Published - All users can
												see
											</span>
										</div>
									)}

									{/* Group Published indicator */}
									{item.status.groupPublished && (
										<div className="relative group">
											<div className="h-2 w-2 bg-blue-500 rounded-full" />
											<span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-blue-500 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
												Group Published - Group members
												only
											</span>
										</div>
									)}

									{/* Private/Owned indicator - only show to Admin/Root */}
									{item.status?.owner &&
										!item.status.userPublished &&
										!item.status.groupPublished &&
										(currentUser?.perms === "Admin" ||
											currentUser?.perms === "Root") && (
											<div className="relative group">
												<Button
													variant="ghost"
													size="sm"
													className="h-4 w-4 p-0 hover:bg-transparent"
													onClick={(e) => {
														e.stopPropagation();
														if (
															item.status?.owner
														) {
															handleOwnerClick(
																item.status
																	.owner
															);
														}
													}}
												>
													<User className="h-4 w-4 text-orange-500 cursor-pointer" />
												</Button>
												<span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-orange-500 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
													{ownerName
														? `Private - Owned by ${ownerName}. Click to view details.`
														: "Private - Click to view owner details"}
												</span>
											</div>
										)}
								</div>
							)}
						</span>
					</Button>
				</div>
				{/* Owner Details Dialog */}
				<Dialog
					open={showOwnerDialog}
					onOpenChange={setShowOwnerDialog}
				>
					<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Owner Details</DialogTitle>
							<DialogDescription>
								View owner information and all shlokas they have
								added
							</DialogDescription>
						</DialogHeader>
						{loadingOwner ? (
							<div className="flex items-center justify-center p-8">
								<Loader2 className="h-6 w-6 animate-spin" />
							</div>
						) : ownerData ? (
							<div className="space-y-4">
								<div className="border rounded-lg p-4">
									<h3 className="font-semibold mb-2">
										Owner Information
									</h3>
									<div className="space-y-1 text-sm">
										<p>
											<strong>Name:</strong>{" "}
											{ownerData.owner.name}
										</p>
										<p>
											<strong>User ID:</strong>{" "}
											{ownerData.owner.id}
										</p>
										<p>
											<strong>Permission Level:</strong>{" "}
											{ownerData.owner.perms}
										</p>
										<p>
											<strong>Total Shlokas:</strong>{" "}
											{ownerData.totalShlokas}
										</p>
									</div>
								</div>
								<div className="border rounded-lg">
									<h3 className="font-semibold mb-2 p-4 border-b">
										Shlokas by Book
									</h3>
									<div className="space-y-4 p-4">
										{ownerData.books.length === 0 ? (
											<p className="text-muted-foreground text-center py-4">
												No shlokas found
											</p>
										) : (
											ownerData.books.map(
												(
													bookData: any,
													idx: number
												) => (
													<div
														key={idx}
														className="border rounded p-3"
													>
														<h4 className="font-medium mb-2">
															{bookData.book}
															{bookData.part1 &&
																` - Part 1: ${bookData.part1}`}
															{bookData.part2 &&
																` - Part 2: ${bookData.part2}`}
														</h4>
														<Table>
															<TableHeader>
																<TableRow>
																	<TableHead>
																		Chapter
																	</TableHead>
																	<TableHead>
																		Shloka
																		No.
																	</TableHead>
																	<TableHead>
																		Content
																	</TableHead>
																	<TableHead>
																		Created
																	</TableHead>
																</TableRow>
															</TableHeader>
															<TableBody>
																{bookData.shlokas.map(
																	(
																		shloka: any,
																		sIdx: number
																	) => (
																		<TableRow
																			key={
																				sIdx
																			}
																		>
																			<TableCell>
																				{
																					shloka.chaptno
																				}
																			</TableCell>
																			<TableCell>
																				{
																					shloka.slokano
																				}
																			</TableCell>
																			<TableCell className="max-w-md truncate">
																				{
																					shloka.spart
																				}
																			</TableCell>
																			<TableCell>
																				{new Date(
																					shloka.createdAt
																				).toLocaleDateString()}
																			</TableCell>
																		</TableRow>
																	)
																)}
															</TableBody>
														</Table>
													</div>
												)
											)
										)}
									</div>
								</div>
							</div>
						) : (
							<p className="text-center text-muted-foreground py-4">
								No owner data available
							</p>
						)}
					</DialogContent>
				</Dialog>
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

// Separate component for the books content
function BooksContent() {
	const { data: currentUser, isLoading: userLoading } = useCurrentUser();
	const {
		data: booksData,
		isLoading: booksLoading,
		error: booksError,
	} = useBooks();
	const queryClient = useQueryClient();

	useEffect(() => {
		// Clear React Query cache when component unmounts (e.g., on sign out)
		return () => {
			queryClient.clear();
		};
	}, [queryClient]);

	const isLoading = userLoading || booksLoading;
	const error = booksError?.message;

	// Transform the books data
	console.log("Books data from API:", booksData);
	const books = booksData
		? booksData.map(
				(book: {
					book: string;
					part1?: any[];
					chapters?: string[];
					status?: any;
				}) => {
					console.log(
						"Processing book:",
						book.book,
						"with status:",
						book.status
					);
					return {
						id: book.book,
						title: book.book,
						type: "book" as const,
						status: book.status,
						children:
							book.part1 && book.part1.length > 0
								? book.part1
										.map((part1: any) => {
											if (part1.part === null) {
												return part1.part2[0].chapters.map(
													(chapter: string) => ({
														id: `${book.book}-chapter-${chapter}`,
														title: `Chapter ${chapter}`,
														type: "chapter" as const,
													})
												);
											}
											if (!part1.part2?.[0]?.part) {
												return {
													id: `${book.book}-${part1.part}`,
													title: part1.part,
													type: "subpart" as const,
													children:
														part1.part2?.[0]?.chapters.map(
															(
																chapter: string
															) => ({
																id: `${book.book}-${part1.part}-chapter-${chapter}`,
																title: `Chapter ${chapter}`,
																type: "chapter" as const,
															})
														) || [],
												};
											}
											return {
												id: `${book.book}-${part1.part}`,
												title: part1.part,
												type: "subpart" as const,
												children: part1.part2
													.map((part2: any) => ({
														id: `${book.book}-${part1.part}-${part2.part}`,
														title: part2.part,
														type: "sub-subpart" as const,
														children:
															part2.chapters.map(
																(
																	chapter: string
																) => ({
																	id: `${book.book}-${part1.part}-${part2.part}-chapter-${chapter}`,
																	title: `Chapter ${chapter}`,
																	type: "chapter" as const,
																})
															),
													}))
													.flat(),
											};
										})
										.flat()
								: book.chapters
								? book.chapters.map((chapter: string) => ({
										id: `${book.book}-chapter-${chapter}`,
										title: `Chapter ${chapter}`,
										type: "chapter" as const,
								  }))
								: [],
					};
				}
		  )
		: [];

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[200px]">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center">
				<div className="text-red-600 dark:text-red-400">{error}</div>
			</div>
		);
	}

	if (books.length === 0) {
		return (
			<div className="text-center text-gray-600 dark:text-gray-300 py-12">
				No books available for your access level.
			</div>
		);
	}

	return books.map((book: Item) => <TreeNode key={book.id} item={book} />);
}

// Main component
export default function SacredTexts() {
	const { isSignedIn, isLoaded: authLoaded } = useAuth();

	// Wait for Clerk to load
	if (!authLoaded) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="p-8">
			<div className="max-w-4xl mx-auto space-y-6">
				<h2 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 mb-8">
					Sanskrit Texts
				</h2>
				<div className="w-full max-w-2xl mx-auto backdrop-blur-sm bg-white/30 dark:bg-gray-900/40 p-6 rounded-xl shadow-xl">
					{!isSignedIn ? (
						<p className="text-center text-gray-600 dark:text-gray-300">
							Please sign in to view the books.
						</p>
					) : (
						<BooksContent />
					)}
				</div>
			</div>
		</div>
	);
}
