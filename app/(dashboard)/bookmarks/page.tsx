"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, BookOpen } from "lucide-react";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

interface Shloka {
	_id: string;
	book: string;
	part1: string;
	part2: string;
	chaptno: string;
	slokano: string;
	spart: string;
}

export default function BookmarksPage() {
	const [bookmarkedShlokas, setBookmarkedShlokas] = useState<Shloka[]>([]);
	const [loading, setLoading] = useState(true);
	const { user, isLoaded } = useUser();

	useEffect(() => {
		const fetchBookmarkedShlokas = async () => {
			try {
				const response = await fetch("/api/bookmarks");
				if (response.ok) {
					const data = await response.json();
					setBookmarkedShlokas(data.shlokas);
				}
			} catch (error) {
				console.error("Error fetching bookmarked shlokas:", error);
			} finally {
				setLoading(false);
			}
		};

		if (isLoaded && user) {
			fetchBookmarkedShlokas();
		}
	}, [user, isLoaded]);

	if (!isLoaded || loading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="flex justify-between items-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Your Bookmarked Shlokas</h1>
					<Badge variant="secondary" className="text-sm px-3 py-1">
						<Loader2 className="size-4 mr-2 animate-spin" /> Loading Bookmarks
					</Badge>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{[1, 2, 3].map((i) => (
						<Card
							key={i}
							className="group h-full overflow-hidden hover:shadow-lg transition-all flex flex-col  justify-between duration-300 
							border border-gray-200 dark:border-gray-800 
							hover:border-purple-300 dark:hover:border-purple-700 
							bg-white/90 dark:bg-gray-900/90"
						>
							<CardHeader
								className=" h-[6.5rem] border-b border-gray-200 dark:border-gray-800 
								bg-gradient-to-r from-purple-50 to-white dark:from-gray-800/50 dark:to-gray-900"
							>
								<Skeleton className="h-6 w-40" />
							</CardHeader>
							<CardContent>
								<div className="h-48 p-6 group-hover:bg-purple-50/50 dark:group-hover:bg-purple-950/10 transition-colors duration-300">
									<Loader2 className="size-6 text-slate-300 animate-spin" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	if (!bookmarkedShlokas || bookmarkedShlokas.length === 0) {
		return (
			<div className="container mx-auto p-8">
				<Card className="max-w-2xl mx-auto">
					<CardHeader className="text-center">
						<CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">No Bookmarks Found</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-[200px] w-full flex flex-col items-center justify-center gap-4">
							<ExclamationTriangleIcon className="w-12 h-12 text-yellow-500" />
							<p className="text-lg text-gray-600 dark:text-gray-400 text-center">You haven't bookmarked any shlokas yet.</p>
							<Link href="/books">
								<Button variant="outline" className="mt-4">
									<BookOpen className="mr-2 h-4 w-4" />
									Browse Books
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Your Bookmarked Shlokas</h1>
				<Badge variant="secondary" className="text-sm px-3 py-1">
					{bookmarkedShlokas.length} Bookmarks
				</Badge>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{bookmarkedShlokas.map((shloka) => (
					<Link href={`/books/${shloka.book}/${shloka.part1}/${shloka.part2}/${shloka.chaptno}/${shloka._id}`} key={shloka._id}>
						<Card
							className="group h-full overflow-hidden hover:shadow-lg transition-all flex flex-col  justify-between duration-300 
							border border-gray-200 dark:border-gray-800 
							hover:border-purple-300 dark:hover:border-purple-700 
							bg-white/90 dark:bg-gray-900/90"
						>
							<CardHeader
								className="border-b border-gray-200 dark:border-gray-800 
								bg-gradient-to-r from-purple-50 to-white dark:from-gray-800/50 dark:to-gray-900"
							>
								<div className="flex items-center justify-between">
									<div className="space-y-1">
										<CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
											{decodeURIComponent(shloka.book)
												.split("_")
												.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
												.join(" ")}
										</CardTitle>
										<p className="text-sm text-gray-500 dark:text-gray-400">Chapter {shloka.chaptno}</p>
									</div>
									<Badge variant="outline" className="text-xs bg-white dark:bg-gray-800">
										Shloka {shloka.slokano}
									</Badge>
								</div>
							</CardHeader>
							<CardContent className="p-6 group-hover:bg-purple-50/50 dark:group-hover:bg-purple-950/10 transition-colors duration-300">
								<div className="space-y-4 text-center">
									{shloka.spart?.split("#").map((part, index) => (
										<p key={index} className="text-lg font-sanskrit leading-relaxed text-gray-800 dark:text-gray-200">
											{part.trim()}
										</p>
									))}
								</div>
							</CardContent>
							<CardFooter
								className="p-4 border-t border-gray-100 dark:border-gray-800 
								bg-gradient-to-r from-white to-purple-50 dark:from-gray-900 dark:to-gray-800/50"
							>
								<Button
									variant="ghost"
									className="w-full text-purple-600 dark:text-purple-400 
									hover:text-purple-700 dark:hover:text-purple-300"
								>
									<BookOpen className="mr-2 h-4 w-4" />
									View Analysis
								</Button>
							</CardFooter>
						</Card>
					</Link>
				))}
			</div>
		</div>
	);
}
