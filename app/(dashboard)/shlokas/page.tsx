"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

// Define the shloka type
type Shloka = {
	_id: any;
	chaptno: string;
	slokano: string;
	spart1: string;
	spart2?: string;
};

export default function Shlokas() {
	const [loading, setLoading] = useState(true); // Loading state
	const [shlokas, setShlokas] = useState<Shloka[]>([]);
	const shlokasRef = useRef<HTMLDivElement>(null); // Reference to the shlokas container
	const [activeShlokaId, setActiveShlokaId] = useState<string | null>(null); // To track active shloka

	// Refs for each shloka card to track visibility
	const shlokaRefs = useRef<{ [key: string]: HTMLElement | null }>({});

	useEffect(() => {
		const fetchShlokas = async () => {
			setLoading(true);
			try {
				const response = await fetch("/api/ahShloka"); // Adjust API route
				const data = await response.json();
				setShlokas(data);
			} catch (error) {
				console.error("Error fetching shlokas:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchShlokas();
	}, []);

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

	if (loading) {
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

	return (
		<div className="flex">
			{/* Shloka List */}
			<div className=" w-3/12">
				<div className="sticky top-24 overflow-auto h-[85vh] flex items-start flex-col gap-2">
					<div className="flex items-center justify-between w-full">
						<strong className="p-2">Shlokas</strong>
					</div>
					{shlokas.map((shloka) => (
						<Button
                        key={shloka._id}
                        variant={shloka._id === activeShlokaId ? "secondary" : "ghost"}
                        onClick={() => {
                            const element = document.getElementById(shloka._id);
                            if (element) {
                                const elementTop = element.getBoundingClientRect().top + window.scrollY; // Get the element's position relative to the document
                                const offset = 100; // Adjust this value based on the new card height (you can fine-tune it)
                                const newScrollPosition = elementTop - offset; // Ensure smooth scrolling is accurate
                                window.scrollTo({
                                    top: newScrollPosition, // Adjusted scroll position
                                    behavior: "smooth", // Smooth scrolling
                                });
                            } else {
                                console.error("Element not found for ID:", shloka._id);
                            }
                        }}
                    >
                        <span className="text-xs font-medium">
                            Chapter {shloka.chaptno} - Shloka {shloka.slokano}
                        </span>
                    </Button>
					))}
				</div>
			</div>

			{/* Shloka Cards */}
			<div className="p-2 pt-8 w-9/12">
				<div className="grid grid-cols-1 gap-6" ref={shlokasRef}>
					{shlokas.map((shloka) => (
						<Link href={`/shlokas/${shloka._id}`} key={shloka._id}>
							<Card
								id={shloka._id}
								ref={(el) => {
									shlokaRefs.current[shloka._id] = el;
								}}
								className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col duration-300 h-[200px]"
							>
								<CardHeader className="border-b border-primary-100">
									<CardTitle className="flex justify-between">
										Chapter {shloka.chaptno} - Shloka{" "}
										{shloka.slokano}
									</CardTitle>
								</CardHeader>
								<CardContent className="p-10 h-full flex flex-col items-center justify-center">
									<p className="text-sm">
										{/* <strong>Part 1:</strong>*/}
										{shloka.spart1}
									</p>
									{shloka.spart2 && (
										<p className="text-sm pt-2">
											{/* <strong>Part 2:</strong>{" "} */}
											{shloka.spart2}
										</p>
									)}
								</CardContent>
								<CardFooter></CardFooter>{" "}
							</Card>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
