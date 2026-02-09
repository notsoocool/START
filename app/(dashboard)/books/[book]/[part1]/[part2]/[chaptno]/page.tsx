"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
} from "@/components/ui/card";
import { useParams } from "next/navigation";
import { useShlokas } from "@/lib/hooks/use-api";
import type { Shloka } from "./ChapterShlokaCards";

const ChapterShlokaCards = dynamic(
	() => import("./ChapterShlokaCards").then((m) => ({ default: m.ChapterShlokaCards })),
	{
		loading: () => (
			<div className="grid grid-cols-1 gap-6">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-40 w-full rounded-lg" />
				))}
			</div>
		),
		ssr: true,
	}
);

export default function Shlokas() {
	const [activeShlokaId, setActiveShlokaId] = useState<string | null>(null);
	const shlokasRef = useRef<HTMLDivElement>(null);
	const shlokaRefs = useRef<{ [key: string]: HTMLElement | null }>({});

	const { book, part1, part2, chaptno } = useParams();
	const {
		data: shlokasData,
		isLoading,
		error,
	} = useShlokas(
		book as string,
		part1 as string,
		part2 as string,
		chaptno as string
	);

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
			<div className="flex min-h-screen flex-col bg-gradient-to-b from-white/80 to-slate-50/80 dark:from-gray-900/80 dark:to-gray-900/80">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:py-10">
					{/* Sidebar skeleton - hidden on mobile */}
					<div className="hidden w-full md:block md:w-3/12">
						<div className="flex flex-col items-start gap-3 rounded-lg bg-background/60 p-3 shadow-sm ring-1 ring-border/60 md:sticky md:top-24 md:max-h-[70vh] md:overflow-hidden">
							<strong className="shrink-0 p-1 text-sm font-semibold">
								Shlokas
							</strong>
							<div className="mt-1 flex w-full flex-1 flex-col gap-2 overflow-y-auto">
								<Skeleton className="h-6 w-full" />
								<Skeleton className="h-6 w-full" />
								<Skeleton className="h-6 w-full" />
							</div>
						</div>
					</div>

					{/* Content skeleton */}
					<div className="w-full px-1 pt-2 md:w-9/12 md:px-2 md:pt-0">
						<div className="mx-auto w-full max-w-screen-2xl">
							<Card className="flex min-h-[200px] flex-col justify-between overflow-hidden border border-border/80 bg-background/80 shadow-sm transition-shadow hover:shadow-md">
								<CardHeader className="border-b border-border/80">
									<Skeleton className="h-6 w-40" />
								</CardHeader>
								<CardContent>
									<div className="flex w-full items-center justify-center py-10">
										<Loader2 className="h-6 w-6 animate-spin text-slate-300" />
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-screen bg-fixed items-center justify-center bg-gradient-to-b from-white/80 to-slate-50/80 dark:from-gray-900/80 dark:to-gray-900/80">
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<div className="text-red-600 text-lg">
						{error.message || "Failed to load shlokas"}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col bg-fixed bg-gradient-to-b from-white/80 to-slate-50/80 dark:from-gray-900/80 dark:to-gray-900/80 transition-colors duration-500">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:py-10">
				{/* Shloka List - hidden on mobile, visible from md (tablet) upwards */}
				<div className="hidden w-full transition-colors duration-500 md:block md:w-3/12">
					<div className="flex flex-col items-start gap-2 rounded-lg bg-background/60 p-3 shadow-sm ring-1 ring-border/60 md:sticky md:top-24 md:max-h-[70vh] md:overflow-hidden">
						<div className="flex w-full shrink-0 items-center justify-between transition-colors duration-500">
							<strong className="p-1 text-lg text-gray-900 transition-colors duration-500 dark:text-gray-100">
								Shlokas
							</strong>
						</div>
						<div className="mt-1 flex w-full flex-1 flex-col gap-1 overflow-y-auto lg:flex-col">
							{shlokas.map((shloka: Shloka) => (
								<Button
									key={shloka._id}
									variant={
										shloka._id === activeShlokaId
											? "secondary"
											: "ghost"
									}
									onClick={() => {
										const element = document.getElementById(
											shloka._id
										);
										if (element) {
											const elementTop =
												element.getBoundingClientRect()
													.top + window.scrollY;
											const offset = 100;
											window.scrollTo({
												top: elementTop - offset,
												behavior: "smooth",
											});
										}
									}}
									className={`w-full shrink-0 justify-start text-xs sm:text-sm transition-colors duration-500
											${
												shloka._id === activeShlokaId
													? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
													: "text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300"
											}`}
								>
									<span className="font-medium">
										Ch. {shloka.chaptno} · Shloka{" "}
										{shloka.slokano}
									</span>
								</Button>
							))}
						</div>
					</div>
				</div>

				{/* Shloka Cards - loaded via next/dynamic for smaller initial bundle */}
				<div className="w-full px-1 pt-2 md:w-9/12 md:px-2 md:pt-0">
					<ChapterShlokaCards
						shlokas={shlokas}
						book={book as string}
						part1={part1 as string}
						part2={part2 as string}
						shlokasRef={shlokasRef}
						shlokaRefs={shlokaRefs}
					/>
				</div>
			</div>
		</div>
	);
}
