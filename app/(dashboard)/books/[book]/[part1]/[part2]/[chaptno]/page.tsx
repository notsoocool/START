"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "next/navigation";
import { useShlokas } from "@/lib/hooks/use-api";
import { usePageReady } from "@/components/ui/PageReadyContext";

// Define the shloka type
type Shloka = {
	_id: any;
	chaptno: string;
	slokano: string;
	spart: string;
};

// Add this at the top of your file, outside the component
const fixedBgStyle = {
	background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(249, 250, 251, 0.8))",
	"@media (prefers-color-scheme: dark)": {
		background: "linear-gradient(to bottom, rgba(17, 24, 39, 0.8), rgba(17, 24, 39, 0.8))",
	},
} as React.CSSProperties;

export default function Shlokas() {
	const [activeShlokaId, setActiveShlokaId] = useState<string | null>(null);
	const shlokasRef = useRef<HTMLDivElement>(null);
	const shlokaRefs = useRef<{ [key: string]: HTMLElement | null }>({});
	const { setPageReady } = usePageReady();

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

	useEffect(() => {
		if (!isLoading) setPageReady(true);
	}, [isLoading, setPageReady]);

	useEffect(() => {
		if (error) setPageReady(true);
	}, [error, setPageReady]);

	if (isLoading) {
		return null;
	}

	if (error) {
		return (
			<div className="flex min-h-screen bg-fixed items-center justify-center" style={fixedBgStyle}>
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<div className="text-red-600 text-lg">{error.message || "Failed to load shlokas"}</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen bg-fixed" style={fixedBgStyle}>
			{/* Shloka List */}
			<div className="w-3/12">
				<div className="sticky top-24 overflow-auto h-[85vh] flex items-start flex-col gap-2">
					<div className="flex items-center justify-between w-full">
						<strong className="p-2 text-gray-900 dark:text-gray-100 text-lg">Shlokas</strong>
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
							className={`w-full justify-start transition-colors duration-200
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
								className="group overflow-hidden hover:shadow-lg transition-all duration-300 
									border border-gray-200 dark:border-gray-800 
									hover:border-purple-300 dark:hover:border-purple-700 
									bg-white/80 dark:bg-gray-900/80"
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
