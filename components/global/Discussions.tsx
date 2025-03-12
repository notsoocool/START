"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface DiscussionProps {
	shlokaId: string;
}

interface User {
	id: string;
	firstName: string;
	lastName: string;
	perms: string[];
}

export function Discussions({ shlokaId }: DiscussionProps) {
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [discussions, setDiscussions] = useState<any[]>([]);
	const [newComment, setNewComment] = useState("");
	const [replyText, setReplyText] = useState("");
	const [loading, setLoading] = useState(false);
	const [replyTo, setReplyTo] = useState<string | null>(null);

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const response = await fetch("/api/getCurrentUser");
				if (response.ok) {
					const userData = await response.json();
					setCurrentUser(userData);
				}
			} catch (error) {
				console.error("Error fetching user:", error);
			}
		};

		fetchUser();
	}, []);

	const fetchDiscussions = async () => {
		try {
			const response = await fetch(`/api/discussions?shlokaId=${shlokaId}`);
			const data = await response.json();
			setDiscussions(data);
		} catch (error) {
			console.error("Error fetching discussions:", error);
		}
	};

	useEffect(() => {
		fetchDiscussions();
	}, [shlokaId]);

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

		setLoading(true);
		try {
			const response = await fetch("/api/discussions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					shlokaId,
					content: commentText,
					parentId: replyTo,
				}),
			});

			if (!response.ok) throw new Error("Failed to post comment");

			setNewComment("");
			setReplyText("");
			setReplyTo(null);
			await fetchDiscussions();
			toast.success("Comment posted successfully!");
		} catch (error) {
			toast.error("Error posting comment");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (!currentUser) {
			toast.error("You must be logged in to delete comments");
			return;
		}

		try {
			const response = await fetch(`/api/discussions/${id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to delete comment");
			}

			await fetchDiscussions();
			toast.success("Comment deleted successfully!");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Error deleting comment");
		}
	};

	const canDeleteComment = (discussion: any) => {
		if (!currentUser) return false;

		// Check if user is owner
		const isOwner = currentUser.id === discussion.userId;
		// Check if user has Admin or Root permissions
		const isAdminOrRoot = currentUser.perms?.includes("Admin") || currentUser.perms?.includes("Root");

		return isOwner || isAdminOrRoot;
	};

	const renderDiscussions = (parentId: string | null = null, depth: number = 0) => {
		const filteredDiscussions = discussions.filter((d) => d.parentId === parentId);

		return filteredDiscussions.map((discussion) => {
			const parentDiscussion = discussions.find((d) => d._id === discussion.parentId);
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
												disabled={!currentUser || loading}
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
												<Button onClick={handleSubmit} disabled={!currentUser || loading}>
													{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
			<div className="space-y-4">
				<Textarea
					placeholder={currentUser ? "Add a comment..." : "Please sign in to comment"}
					value={newComment}
					onChange={(e) => setNewComment(e.target.value)}
					disabled={!currentUser || loading}
				/>
				<div className="flex items-center justify-between">
					{replyTo && (
						<Button variant="ghost" onClick={() => setReplyTo(null)}>
							Cancel Reply
						</Button>
					)}
					<Button onClick={handleSubmit} disabled={!currentUser || loading}>
						{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Post Comment
					</Button>
				</div>
			</div>
			<div className="space-y-4">{renderDiscussions(null)}</div>
		</div>
	);
}
