"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Share2Icon, Trash } from "lucide-react";
import BookmarkButton from "./BookmarkButton";
import { toPng } from "html-to-image";
import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ShlokaCardProps {
	book: string | string[];
	chaptno: string;
	shloka: {
		_id: string;
		slokano: string;
		spart: string;
	};
	analysisID: string;
	permissions: string | null;
	part1: string;
	part2: string;
}

export function ShlokaCard({ book, chaptno, shloka, analysisID, permissions, part1, part2 }: ShlokaCardProps) {
	const shlokaRef = useRef<HTMLDivElement>(null);
	const router = useRouter();
	const [deleteAnalysisDialogOpen, setDeleteAnalysisDialogOpen] = useState(false);

	const handleShare = async () => {
		if (!shlokaRef.current) return;

		try {
			const dataUrl = await toPng(shlokaRef.current, {
				quality: 1.0,
				backgroundColor: "white",
			});

			// For mobile devices, use native share if available
			if (navigator.share) {
				const blob = await (await fetch(dataUrl)).blob();
				const file = new File([blob], "shloka.png", { type: "image/png" });
				await navigator.share({
					files: [file],
					title: `${book} ${chaptno}.${shloka.slokano}`,
				});
			} else {
				// Fallback to download
				const link = document.createElement("a");
				link.download = `shloka-${chaptno}-${shloka.slokano}.png`;
				link.href = dataUrl;
				link.click();
			}
		} catch (error) {
			console.error("Error sharing:", error);
		}
	};

	const handleDiscussionClick = () => {
		const discussionSection = document.getElementById("discussions");
		if (discussionSection) {
			discussionSection.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	const handleDeleteAnalysis = async () => {
		try {
			const loadingToast = toast.loading("Deleting analysis and shloka...");

			// Delete shloka first
			const deleteShlokaResponse = await fetch(`/api/ahShloka/${shloka._id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
			});

			if (!deleteShlokaResponse.ok) {
				const shlokaError = await deleteShlokaResponse.json();
				throw new Error(`Failed to delete shloka: ${shlokaError.error}`);
			}

			// Then delete analysis
			const deleteAnalysisResponse = await fetch(`/api/deleteShlokaAnalysis/${book}/${part1}/${part2}/${chaptno}/${shloka.slokano}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
			});

			if (!deleteAnalysisResponse.ok) {
				const analysisError = await deleteAnalysisResponse.json();
				toast.dismiss(loadingToast);
				toast.warning("Shloka was deleted but analysis deletion failed. Please contact admin.");
				throw new Error(`Failed to delete analysis: ${analysisError.error}`);
			}

			toast.dismiss(loadingToast);
			toast.success("Analysis and Shloka deleted successfully");

			// Navigate back to the chapter page
			router.push(`/books/${book}/${part1}/${part2}/${chaptno}`);
		} catch (error) {
			console.error("Delete error:", error);
			toast.error("Error during deletion: " + (error as Error).message);
		} finally {
			setDeleteAnalysisDialogOpen(false);
		}
	};

	const renderDeleteAnalysisDialog = () => (
		<Dialog open={deleteAnalysisDialogOpen} onOpenChange={setDeleteAnalysisDialogOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Entire Analysis</DialogTitle>
					<DialogDescription>Are you sure you want to delete this entire analysis and its associated shloka? This action cannot be undone.</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => setDeleteAnalysisDialogOpen(false)}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleDeleteAnalysis}>
						Delete Everything
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);

	console.log("ShlokaCard props:", {
		shlokaID: shloka._id,
		analysisID,
	});

	return (
		<Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
			<div ref={shlokaRef}>
				<CardHeader className="border-b border-border flex flex-row justify-between items-center h-16">
					<div className="flex items-center gap-2">
						<CardTitle className="text-lg font-medium">
							{decodeURIComponent(typeof book === "string" ? book : book[0])
								.split("_")
								.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
								.join(" ")}
						</CardTitle>
						<Badge variant="outline" className="text-xs">
							{chaptno}.{shloka?.slokano}
						</Badge>
					</div>
					<div className="flex items-center gap-2">
						<BookmarkButton analysisID={analysisID} shlokaID={shloka._id} />
						{(permissions === "Root" || permissions === "Admin" || permissions === "Editor") && (
							<Button variant="destructive" size="icon" onClick={() => setDeleteAnalysisDialogOpen(true)} className="size-8">
								<Trash className="size-4" />
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="p-6">
					<div className="space-y-4">
						<div className="text-center space-y-2">
							{shloka?.spart.split("#").map((part, index) => (
								<p key={index} className="text-lg font-sanskrit leading-relaxed">
									{part.trim()}
								</p>
							))}
						</div>
						<Separator className="my-4" />
						<div className="flex justify-center gap-4">
							<Button variant="outline" size="sm" onClick={handleDiscussionClick}>
								<MessageSquare className="h-4 w-4 mr-2" />
								Discussions
							</Button>
							<Button variant="outline" size="sm" onClick={handleShare}>
								<Share2Icon className="h-4 w-4 mr-2" />
								Share
							</Button>
						</div>
					</div>
				</CardContent>
			</div>
			{renderDeleteAnalysisDialog()}
		</Card>
	);
}
