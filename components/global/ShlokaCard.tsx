"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Share2Icon, Trash, Edit2 } from "lucide-react";
import BookmarkButton from "./BookmarkButton";
import { toPng } from "html-to-image";
import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

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
	onShlokaUpdate?: (updatedShloka: { _id: string; slokano: string; spart: string }) => void;
}

export function ShlokaCard({ book, chaptno, shloka, analysisID, permissions, part1, part2, onShlokaUpdate }: ShlokaCardProps) {
	const shlokaRef = useRef<HTMLDivElement>(null);
	const router = useRouter();
	const [deleteAnalysisDialogOpen, setDeleteAnalysisDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editedShloka, setEditedShloka] = useState({
		slokano: shloka.slokano,
		spart: shloka.spart,
	});
	const [isEditing, setIsEditing] = useState(false);

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

			// Delete shloka first with complete deletion flag
			const deleteShlokaResponse = await fetch(`/api/ahShloka/${shloka._id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
				body: JSON.stringify({ isCompleteDeletion: true }),
			});

			if (!deleteShlokaResponse.ok) {
				const shlokaError = await deleteShlokaResponse.json();
				throw new Error(`Failed to delete shloka: ${shlokaError.error}`);
			}

			// Then delete analysis with complete deletion flag
			const deleteAnalysisResponse = await fetch(`/api/deleteShlokaAnalysis/${book}/${part1}/${part2}/${chaptno}/${shloka.slokano}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
				body: JSON.stringify({ isCompleteDeletion: true }),
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

	const handleEdit = async () => {
		try {
			setIsEditing(true);
			const loadingToast = toast.loading("Checking shloka number...");

			// If slokano changed, check for duplicates first
			if (editedShloka.slokano !== shloka.slokano) {
				const checkResponse = await fetch("/api/ahShloka/check-duplicate", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
					},
					body: JSON.stringify({
						book,
						part1,
						part2,
						chaptno,
						slokano: editedShloka.slokano,
						currentShlokaId: shloka._id,
					}),
				});

				if (!checkResponse.ok) {
					throw new Error("Failed to check shloka number");
				}

				const { exists, message } = await checkResponse.json();
				if (exists) {
					toast.dismiss(loadingToast);
					toast.error(message);
					return;
				}
			}

			toast.loading("Updating shloka...", { id: loadingToast });

			// Update shloka model
			const shlokaResponse = await fetch(`/api/ahShloka/${shloka._id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
				body: JSON.stringify({
					slokano: editedShloka.slokano,
					spart: editedShloka.spart,
				}),
			});

			if (!shlokaResponse.ok) {
				const errorData = await shlokaResponse.json();
				throw new Error(errorData.error || "Failed to update shloka");
			}

			// If slokano changed, update analysis model
			if (editedShloka.slokano !== shloka.slokano) {
				const analysisResponse = await fetch(`/api/analysis/${book}/${part1}/${part2}/${chaptno}/${shloka.slokano}`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
					},
					body: JSON.stringify({
						newSlokano: editedShloka.slokano,
					}),
				});

				if (!analysisResponse.ok) {
					const errorData = await analysisResponse.json();
					throw new Error(errorData.message || "Failed to update analysis");
				}
			}

			toast.dismiss(loadingToast);
			toast.success("Shloka updated successfully");

			// Call the update callback if provided
			if (onShlokaUpdate) {
				onShlokaUpdate({
					_id: shloka._id,
					slokano: editedShloka.slokano,
					spart: editedShloka.spart,
				});
			}

			setEditDialogOpen(false);
		} catch (error) {
			console.error("Edit error:", error);
			toast.error("Error updating shloka: " + (error as Error).message);
		} finally {
			setIsEditing(false);
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

	const renderEditDialog = () => (
		<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Edit Shloka</DialogTitle>
					<DialogDescription>Edit the shloka number and content. Changes will be reflected in both shloka and analysis models.</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">Shloka Number</label>
						<Input
							value={editedShloka.slokano}
							onChange={(e) => setEditedShloka((prev) => ({ ...prev, slokano: e.target.value }))}
							placeholder="Enter shloka number"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Shloka Content</label>
						<textarea
							value={editedShloka.spart}
							onChange={(e) => setEditedShloka((prev) => ({ ...prev, spart: e.target.value }))}
							className="w-full min-h-[200px] p-2 border rounded-md"
							placeholder="Enter shloka content (use # for line breaks)"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isEditing}>
						Cancel
					</Button>
					<Button onClick={handleEdit} disabled={isEditing}>
						{isEditing ? (
							<>
								<Loader2 className="size-4 animate-spin mr-2" />
								Updating...
							</>
						) : (
							"Save Changes"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);


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
							{decodeURIComponent(chaptno)}.{shloka?.slokano}
						</Badge>
					</div>
					<div className="flex items-center gap-2">
						<BookmarkButton analysisID={analysisID} shlokaID={shloka._id} />
						{(permissions === "Root" || permissions === "Admin" || permissions === "Editor") && (
							<>
								<Button variant="outline" size="icon" onClick={() => setEditDialogOpen(true)} className="size-8">
									<Edit2 className="size-4" />
								</Button>
								<Button variant="destructive" size="icon" onClick={() => setDeleteAnalysisDialogOpen(true)} className="size-8">
									<Trash className="size-4" />
								</Button>
							</>
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
			{renderEditDialog()}
		</Card>
	);
}
