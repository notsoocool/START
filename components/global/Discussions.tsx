"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useDiscussions, useAddDiscussion, useCurrentUser } from "@/lib/hooks/use-api";

interface DiscussionProps {
	shlokaId: string;
}

interface Discussion {
	_id: string;
	shlokaId: string;
	userId: string;
	userName: string;
	content: string;
	parentId?: string;
	createdAt: string;
}

export function Discussions({ shlokaId }: DiscussionProps) {
	const { data: currentUser } = useCurrentUser();
	const { data: discussions = [], isLoading, error, refetch } = useDiscussions(shlokaId);
	const addDiscussion = useAddDiscussion();
	const [newComment, setNewComment] = useState("");
	const [replyText, setReplyText] = useState("");
	const [replyTo, setReplyTo] = useState<string | null>(null);

	const handleSubmit = async () => {
		if (!currentUser) {
			toast.error("Please sign in to comment");
			return;
		}
		const commentText = replyTo ? replyText : newComment;
		if (!commentText.trim()) {
			toast.error("Please enter a comment");
			return;
		}
		addDiscussion.mutate(
			{ shlokaId, message: commentText },
			{
				onSuccess: () => {
					setNewComment("");
					setReplyText("");
					setReplyTo(null);
					refetch();
					toast.success("Comment posted successfully!");
				},
				onError: () => {
					toast.error("Error posting comment");
				},
			}
		);
	};

	const handleDelete = async (id: string) => {
		if (!currentUser) {
			toast.error("You must be logged in to delete comments");
			return;
		}

		try {
			const response = await fetch(`/api/discussions/${id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to delete comment");
			}

			refetch();
			toast.success("Comment deleted successfully!");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Error deleting comment");
		}
	};

	const canDeleteComment = (discussion: Discussion) => {
		if (!currentUser) return false;
		const isOwner = currentUser.id === discussion.userId;
		const isAdminOrRoot = Array.isArray(currentUser.perms)
			? currentUser.perms.includes("Admin") || currentUser.perms.includes("Root")
			: ["Admin", "Root"].includes(currentUser.perms);
		return isOwner || isAdminOrRoot;
	};

	const renderDiscussions = (parentId: string | null = null, depth: number = 0): JSX.Element[] => {
		const filteredDiscussions = discussions.filter((d: Discussion) => d.parentId === parentId);
		return filteredDiscussions.map((discussion: Discussion) => {
			const parentDiscussion = discussions.find((d: Discussion) => d._id === discussion.parentId);
			const isReplying = replyTo === discussion._id;
			return (
				<div key={discussion._id} className={`${depth > 0 ? "ml-8 border-l-2 border-muted pl-4" : ""}`}>
					<Card className="mb-4">
						<CardContent className="pt-4">
							<div className="flex items-start gap-4">
								<Avatar>
									<AvatarFallback>{discussion.userName[0]}</AvatarFallback>
								</Avatar>
								<div className="flex-1">
									<div className="flex items-center justify-between">
										<div>
											<p className="font-semibold">{discussion.userName}</p>
											{parentDiscussion && <p className="text-sm text-muted-foreground">Replying to {parentDiscussion.userName}</p>}
											<p className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })}</p>
										</div>
										{canDeleteComment(discussion) && (
											<Button variant="ghost" size="icon" onClick={() => handleDelete(discussion._id)}>
												<Trash2 className="h-4 w-4" />
											</Button>
										)}
									</div>
									<p className="mt-2">{discussion.content}</p>
									<Button variant="ghost" size="sm" className="mt-2" onClick={() => setReplyTo(discussion._id)}>
										<MessageSquare className="h-4 w-4 mr-2" />
										Reply
									</Button>
									{isReplying && (
										<div className="mt-4 space-y-2">
											<Textarea
												placeholder="Write your reply..."
												value={replyText}
												onChange={(e) => setReplyText(e.target.value)}
												disabled={!currentUser || addDiscussion.status === "pending"}
												className="min-h-[100px]"
											/>
											<div className="flex justify-end gap-2">
												<Button
													variant="ghost"
													onClick={() => {
														setReplyTo(null);
														setReplyText("");
													}}
												>
													Cancel
												</Button>
												<Button onClick={handleSubmit} disabled={!currentUser || addDiscussion.status === "pending"}>
													{addDiscussion.status === "pending" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
													Reply
												</Button>
											</div>
										</div>
									)}
								</div>
							</div>
						</CardContent>
					</Card>
					{renderDiscussions(discussion._id, depth + 1)}
				</div>
			);
		});
	};

	return (
		<div className="space-y-4">
			{isLoading ? (
				<div className="flex justify-center py-8">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
				</div>
			) : error ? (
				<div className="text-red-500">Failed to load discussions</div>
			) : (
				<>
					<div className="space-y-4">
						<Textarea
							placeholder={currentUser ? "Add a comment..." : "Please sign in to comment"}
							value={newComment}
							onChange={(e) => setNewComment(e.target.value)}
							disabled={!currentUser || addDiscussion.status === "pending"}
						/>
						<div className="flex items-center justify-between">
							{replyTo && (
								<Button variant="ghost" onClick={() => setReplyTo(null)}>
									Cancel Reply
								</Button>
							)}
							<Button onClick={handleSubmit} disabled={!currentUser || addDiscussion.status === "pending"}>
								{addDiscussion.status === "pending" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Post Comment
							</Button>
						</div>
					</div>
					<div className="space-y-4">{renderDiscussions()}</div>
				</>
			)}
		</div>
	);
}
