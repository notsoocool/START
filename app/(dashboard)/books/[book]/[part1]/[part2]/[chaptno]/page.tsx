"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "next/navigation";
import { useShlokas } from "@/lib/hooks/use-api";

// Define the shloka type
type Shloka = {
	_id: any;
	chaptno: string;
	slokano: string;
	spart: string;
};

export default function Shlokas() {
	const [activeShlokaId, setActiveShlokaId] = useState<string | null>(null);
	const shlokasRef = useRef<HTMLDivElement>(null);
	const shlokaRefs = useRef<{ [key: string]: HTMLElement | null }>({});

	const { book, part1, part2, chaptno } = useParams();
	const { data: shlokasData, isLoading, error } = useShlokas(book as string, part1 as string, part2 as string, chaptno as string);

	const shlokas = shlokasData?.shlokas || [];

	// Scroll event to observe which shloka is visible
	const handleScroll = useCallback(() => {
		Object.keys(shlokaRefs.current).forEach((shlokaId) => {
			const ref = shlokaRefs.current[shlokaId];
			if (ref) {
				const rect = ref.getBoundingClientRect();
				const elementTop = rect.top;
				const elementBottom = rect.bottom;

				// Check if the element is near the middle of the viewport
				if (
					elementTop < window.innerHeight / 3 && // Adjust this threshold as needed
					elementBottom > window.innerHeight / 3
				) {
					setActiveShlokaId(shlokaId);
				}
			}
		});
	}, []);

	useEffect(() => {
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);

	if (isLoading) {
		return (
			<div className="flex">
				<div className="w-3/12">
					<div className="sticky top-24 overflow-auto h-auto flex items-start flex-col gap-3">
						<strong className="p-2">Shlokas</strong>
						<Skeleton className="mt-2 h-6 w-48" />
						<Skeleton className="mt-2 h-6 w-48 delay-150" />
						<Skeleton className="mt-2 h-6 w-48 delay-300" />
					</div>
				</div>
				<div className="p-2 pt-8 w-9/12">
					<div className="max-w-screen-2xl mx-auto w-full">
						<Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col justify-between min-h-[200px] duration-300">
							<CardHeader className="border-b border-primary-100">
								<Skeleton className="h-6 w-40" />
							</CardHeader>
							<CardContent>
								<div className=" w-full flex items-center justify-center">
									<Loader2 className="size-6 text-slate-300 animate-spin" />
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-screen bg-fixed items-center justify-center bg-gradient-to-b from-white/80 to-slate-50/80 dark:from-gray-900/80 dark:to-gray-900/80">
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<div className="text-red-600 text-lg">{error.message || "Failed to load shlokas"}</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen bg-fixed bg-gradient-to-b from-white/80 to-slate-50/80 dark:from-gray-900/80 dark:to-gray-900/80 transition-colors duration-500">
			{/* Shloka List */}
			<div className="w-3/12 transition-colors duration-500">
				<div className="sticky top-24 overflow-auto h-[85vh] flex items-start flex-col gap-2 transition-colors duration-500">
					<div className="flex items-center justify-between w-full transition-colors duration-500">
						<strong className="p-2 text-gray-900 dark:text-gray-100 text-lg transition-colors duration-500">Shlokas</strong>
					</div>
					{shlokas.map((shloka: Shloka) => (
						<Button
							key={shloka._id}
							variant={shloka._id === activeShlokaId ? "secondary" : "ghost"}
							onClick={() => {
								const element = document.getElementById(shloka._id);
								if (element) {
									const elementTop = element.getBoundingClientRect().top + window.scrollY;
									const offset = 100;
									window.scrollTo({
										top: elementTop - offset,
										behavior: "smooth",
									});
								}
							}}
							className={`w-full justify-start transition-colors duration-500
									${
										shloka._id === activeShlokaId
											? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
											: "text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300"
									}`}
						>
							<span className="text-sm font-medium">
								Chapter {shloka.chaptno} - Shloka {shloka.slokano}
							</span>
						</Button>
					))}
				</div>
			</div>

			{/* Shloka Cards */}
			<div className="p-2 pt-8 w-9/12">
				<div className="grid grid-cols-1 gap-6" ref={shlokasRef}>
					{shlokas.map((shloka: Shloka) => (
						<Link href={`/books/${book}/${part1}/${part2}/${shloka.chaptno}/${shloka._id}`} key={shloka._id} data-navigate="true">
							<Card
								id={shloka._id}
								ref={(el) => {
									shlokaRefs.current[shloka._id] = el;
								}}
								className="group overflow-hidden hover:shadow-lg transition-all duration-500 border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 bg-white/80 dark:bg-gray-900/80 transition-colors duration-500"
							>
								<CardHeader className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-800/90">
									<CardTitle className="flex justify-between text-gray-900 dark:text-gray-100">
										Chapter {shloka.chaptno} - Shloka {shloka.slokano}
									</CardTitle>
								</CardHeader>
								<CardContent className="p-8 group-hover:bg-purple-50/80 dark:group-hover:bg-purple-950/20 transition-colors duration-300">
									<div className="space-y-4 text-center">
										{shloka.spart.split("#").map((part, index) => (
											<p key={index} className="text-lg text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
												{part.trim()}
											</p>
										))}
									</div>
								</CardContent>
								<CardFooter
									className="flex justify-end py-2 px-4 text-sm text-purple-600 dark:text-purple-400 
									opacity-0 group-hover:opacity-100 transition-opacity duration-300"
								>
									View Analysis →
								</CardFooter>
							</Card>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
