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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
	const queryClient = useQueryClient();
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [isCombining, setIsCombining] = useState(false);
	const [canCombine, setCanCombine] = useState(false);
	const [combineOpen, setCombineOpen] = useState(false);
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

	// Root and Admin may always combine. An Editor may combine only if their
	// group is assigned to this book. Annotators cannot combine. The server
	// re-checks this independently.
	useEffect(() => {
		let active = true;
		const decodedBook = decodeURIComponent((book as string) || "");

		const fetchCombinePermission = async () => {
			try {
				const userResponse = await fetch("/api/getCurrentUser");
				if (!userResponse.ok) throw new Error("Not authenticated");
				const userData = await userResponse.json();
				const perms = userData.perms;

				if (perms === "Root" || perms === "Admin") {
					if (active) setCanCombine(true);
					return;
				}

				if (perms === "Editor") {
					const groupsResponse = await fetch("/api/groups");
					if (!groupsResponse.ok) throw new Error("Failed to fetch groups");
					const groupsData = await groupsResponse.json();
					const isAssigned = Array.isArray(groupsData) && groupsData.some(
						(group: any) =>
							group.members?.includes(userData.id) &&
							group.assignedBooks?.includes(decodedBook)
					);
					if (active) setCanCombine(isAssigned);
					return;
				}

				if (active) setCanCombine(false);
			} catch {
				if (active) setCanCombine(false);
			}
		};

		fetchCombinePermission();
		return () => {
			active = false;
		};
	}, [book]);

	// Drop any selected id that is no longer present in the loaded shloka list
	// (e.g. after a refetch removed/renamed a shloka).
	useEffect(() => {
		setSelectedIds((current) => {
			const filtered = current.filter((id) =>
				shlokas.some((shloka: Shloka) => shloka._id === id)
			);
			return filtered.length === current.length ? current : filtered;
		});
	}, [shlokas]);

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

	const toggleSelected = (id: string) => {
		setSelectedIds((current) =>
			current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
		);
	};

	const handleCombine = async () => {
		if (selectedIds.length < 2 || isCombining) return;

		setIsCombining(true);
		try {
			const response = await fetch("/api/shlokas/cluster", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
				body: JSON.stringify({ shlokaIds: selectedIds }),
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(data.error || "Failed to cluster shlokas");
			}
			toast.success(`Combined into shloka ${data.slokano}`);
			setCombineOpen(false);
			setSelectedIds([]);
			await queryClient.invalidateQueries({
				queryKey: ["shlokas", book, part1, part2, chaptno],
			});
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			setIsCombining(false);
		}
	};

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

	const selectedLabels = shlokas
		.filter((shloka: Shloka) => selectedIds.includes(shloka._id))
		.map((shloka: Shloka) => shloka.slokano)
		.join(", ");

	return (
		<div className="flex min-h-screen flex-col bg-fixed bg-gradient-to-b from-white/80 to-slate-50/80 dark:from-gray-900/80 dark:to-gray-900/80 transition-colors duration-500">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:py-10">
				{/* Shloka List - hidden on mobile, visible from md (tablet) upwards */}
				<div className="hidden w-full transition-colors duration-500 md:block md:w-3/12">
					<div className="flex flex-col items-start gap-2 rounded-lg bg-background/60 p-3 shadow-sm ring-1 ring-border/60 md:sticky md:top-24 md:max-h-[70vh] md:overflow-hidden">
						<div className="flex w-full shrink-0 items-center justify-between gap-2 transition-colors duration-500">
							<strong className="p-1 text-lg text-gray-900 transition-colors duration-500 dark:text-gray-100">
								Shlokas
							</strong>
						{canCombine && selectedIds.length >= 2 && (
							<Button
								size="sm"
								disabled={isCombining}
								onClick={() => setCombineOpen(true)}
							>
								{isCombining ? "Combining..." : `Combine (${selectedIds.length})`}
							</Button>
						)}
					</div>
					<div className="mt-1 flex w-full flex-1 flex-col gap-1 overflow-y-auto lg:flex-col">
						{shlokas.map((shloka: Shloka) => (
							<div
								key={shloka._id}
								className="flex w-full shrink-0 items-center gap-2"
							>
								{canCombine && (
									<input
										type="checkbox"
										checked={selectedIds.includes(shloka._id)}
										disabled={isCombining}
										onChange={() => toggleSelected(shloka._id)}
										aria-label={`Select shloka ${shloka.slokano}`}
									/>
								)}
								<Button
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
							</div>
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
			<Dialog open={combineOpen} onOpenChange={setCombineOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Combine shlokas</DialogTitle>
						<DialogDescription>
							Combine shlokas {selectedLabels} into one card. Their
							sentences stay separate.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setCombineOpen(false)}
							disabled={isCombining}
						>
							Cancel
						</Button>
						<Button onClick={handleCombine} disabled={isCombining}>
							{isCombining ? "Combining..." : "Combine"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
