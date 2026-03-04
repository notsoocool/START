"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send, Mail, Check, AlertCircle, Trash2, Megaphone, Trash } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { useNotifications } from "@/lib/hooks/use-api";
import { useQueryClient } from "@tanstack/react-query";

interface User {
	userID: string;
	name: string;
	perms: string;
}

interface Notification {
	_id: string;
	senderID: string;
	senderName: string;
	recipientID: string | null;
	recipientName: string | null;
	subject: string;
	message: string;
	isRead: boolean;
	createdAt: string;
	isFromUser: boolean;
	isErrorReport: boolean;
	isResolved: boolean;
	resolutionMessage?: string;
	resolvedAt?: string;
}

export default function NotificationsPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [users, setUsers] = useState<User[]>([]);
	const [page, setPage] = useState(1);
	const { data: notificationsData, isLoading: notificationsLoading } = useNotifications(page);
	const [sending, setSending] = useState(false);
	const [currentUser, setCurrentUser] = useState<{ id: string; perms: string } | null>(null);
	type RecipientType = "all" | "editors" | "annotators" | "admins" | "user";
	const [recipientType, setRecipientType] = useState<RecipientType>("all");
	const [selectedUser, setSelectedUser] = useState<string>("");
	const [subject, setSubject] = useState("");
	const [message, setMessage] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState("view");
	const [resolutionMessages, setResolutionMessages] = useState<Record<string, string>>({});
	const [isFixesAnnouncement, setIsFixesAnnouncement] = useState(false);
	const [userSearch, setUserSearch] = useState("");
	const [userPopoverOpen, setUserPopoverOpen] = useState(false);

	// Fetch current user and check if they're Root
	useEffect(() => {
		const fetchCurrentUser = async () => {
			try {
				const response = await fetch("/api/getCurrentUser");
				const data = await response.json();

				if (response.ok) {
					setCurrentUser({ id: data.id, perms: data.perms });

					// If not Root, redirect to dashboard
					if (data.perms !== "Root") {
						router.push("/");
					}
				} else {
					console.error("Error fetching current user:", data.error);
				}
			} catch (error) {
				console.error("Error fetching current user:", error);
			}
		};

		fetchCurrentUser();
	}, [router]);

	// Fetch all users for the dropdown
	useEffect(() => {
		const fetchUsers = async () => {
			try {
				const response = await fetch("/api/getAllUsers?all=true");
				const data = await response.json();

				if (response.ok) {
					setUsers(data.users);
				} else {
					console.error("Error fetching users:", data.error);
				}
			} catch (error) {
				console.error("Error fetching users:", error);
			}
		};

		if (currentUser?.perms === "Root") {
			fetchUsers();
		}
	}, [currentUser]);

	const totalPages = notificationsData?.pagination?.pages ?? 1;

	const handleSendNotification = async () => {
		if (!subject.trim() || !message.trim()) {
			setError("Subject and message are required");
			return;
		}

		try {
			setSending(true);
			setError(null);
			setSuccess(null);

			const response = await fetch("/api/notifications/send", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					recipientType,
					recipientID: recipientType === "user" ? selectedUser : undefined,
					subject,
					message,
					shouldDeleteAfterRead: isFixesAnnouncement,
					deleteAfterHours: isFixesAnnouncement ? 168 : 24,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				const count = data.count ?? 1;
				setSuccess(`Notification sent successfully${count > 1 ? ` to ${count} recipients` : ""}!`);
				setSubject("");
				setMessage("");
				setRecipientType("all");
				setSelectedUser("");
				setUserSearch("");
				queryClient.invalidateQueries({ queryKey: ["notifications"] });
			} else {
				setError(data.error || "Failed to send notification");
			}
		} catch (error) {
			console.error("Error sending notification:", error);
			setError("An error occurred while sending the notification");
		} finally {
			setSending(false);
		}
	};

	const handleMarkAsRead = async (notificationId: string) => {
		try {
			const response = await fetch("/api/notifications/markRead", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ notificationId }),
			});

			if (response.ok) {
				queryClient.invalidateQueries({ queryKey: ["notifications"] });
			}
		} catch (error) {
			console.error("Error marking notification as read:", error);
		}
	};

	const handleResolveError = async (notificationId: string, resolutionMessage: string) => {
		try {
			const response = await fetch("/api/notifications/resolveError", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ notificationId, resolutionMessage }),
			});

			if (response.ok) {
				setResolutionMessages((prev) => ({ ...prev, [notificationId]: "" }));
				queryClient.invalidateQueries({ queryKey: ["notifications"] });
			}
		} catch (error) {
			console.error("Error resolving error report:", error);
		}
	};

	const [cleanupRunning, setCleanupRunning] = useState(false);
	const [cleanupResult, setCleanupResult] = useState<{ deleted: { total: number; afterRead: number; byAge: number } } | null>(null);

	const handleRunCleanup = async () => {
		try {
			setCleanupRunning(true);
			setCleanupResult(null);
			const response = await fetch("/api/notifications/cleanup", { method: "POST" });
			const data = await response.json();
			if (response.ok) {
				setCleanupResult(data);
				queryClient.invalidateQueries({ queryKey: ["notifications"] });
			}
		} catch (e) {
			console.error(e);
		} finally {
			setCleanupRunning(false);
		}
	};

	const handleDeleteNotification = async (notificationId: string) => {
		try {
			const response = await fetch(`/api/notifications/delete?notificationId=${notificationId}`, {
				method: "DELETE",
			});

			if (response.ok) {
				queryClient.invalidateQueries({ queryKey: ["notifications"] });
			}
		} catch (error) {
			console.error("Error deleting notification:", error);
		}
	};

	const formatDate = (dateString: string) => {
		try {
			return format(new Date(dateString), "MMM d, yyyy h:mm a");
		} catch (error) {
			return dateString;
		}
	};

	if (!currentUser || currentUser.perms !== "Root") {
		return (
			<div className="flex items-center justify-center h-screen">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8">
			<h1 className="text-3xl font-bold mb-6">Admin Notifications</h1>

			<Tabs defaultValue="view" value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="mb-6">
					<TabsTrigger value="view">View Notifications</TabsTrigger>
					<TabsTrigger value="send">Send Notification</TabsTrigger>
				</TabsList>

				<TabsContent value="view">
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle>All Notifications</CardTitle>
									<CardDescription>View and manage all notifications. Old notifications (30+ days) are auto-deleted daily.</CardDescription>
								</div>
								<Button variant="outline" size="sm" onClick={handleRunCleanup} disabled={cleanupRunning}>
									{cleanupRunning ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<>
											<Trash className="h-4 w-4 mr-1" />
											Run cleanup
										</>
									)}
								</Button>
							</div>
							{cleanupResult && (
								<div className="text-sm text-muted-foreground mt-2">
									Deleted {cleanupResult.deleted.total} notification(s) — {cleanupResult.deleted.afterRead} after read, {cleanupResult.deleted.byAge} by age
								</div>
							)}
						</CardHeader>
						<CardContent>
							{notificationsLoading ? (
								<div className="flex justify-center py-8">
									<Loader2 className="h-8 w-8 animate-spin text-primary" />
								</div>
							) : (notificationsData?.notifications ?? []).length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">No notifications found</div>
							) : (
								<div className="space-y-4">
									{(notificationsData?.notifications ?? []).map((notification) => (
										<div key={notification._id} className={`p-4 rounded-lg border ${notification.isRead ? "bg-background" : "bg-muted/50"}`}>
											<div className="flex justify-between items-start">
												<div>
													<h3 className="font-medium">{notification.subject}</h3>
													<p className="text-sm text-muted-foreground">
														From: {notification.senderName}
														{notification.recipientName && <>, To: {notification.recipientName}</>}
													</p>
													<p className="text-xs text-muted-foreground mt-1">{formatDate(notification.createdAt)}</p>
												</div>
												<div className="flex items-center space-x-2">
													{notification.isErrorReport && (
														<Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
															Error Report
														</Badge>
													)}
													{notification.isResolved && (
														<Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
															Resolved
														</Badge>
													)}
													{notification.isFromUser && (
														<Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
															From User
														</Badge>
													)}
													<div className="flex items-center space-x-1">
														{!notification.isRead && (
															<Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(notification._id)}>
																<Check className="h-4 w-4" />
															</Button>
														)}
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleDeleteNotification(notification._id)}
															className="text-red-500 hover:text-red-700 hover:bg-red-50"
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
												</div>
											</div>
											<Separator className="my-2" />
											<p className="whitespace-pre-wrap">{notification.message}</p>
											{notification.isErrorReport && !notification.isResolved && (
												<>
													<Separator className="my-2" />
													<div className="mt-2">
														<Textarea
															placeholder="Enter resolution message..."
															className="mb-2"
															value={resolutionMessages[notification._id] || ""}
															onChange={(e) => setResolutionMessages({ ...resolutionMessages, [notification._id]: e.target.value })}
														/>
														<Button variant="outline" size="sm" onClick={() => handleResolveError(notification._id, resolutionMessages[notification._id])}>
															Resolve Error
														</Button>
													</div>
												</>
											)}
											{notification.isResolved && notification.resolutionMessage && (
												<>
													<Separator className="my-2" />
													<div className="mt-2 p-2 bg-green-50 rounded-md">
														<p className="text-sm font-medium text-green-800">Resolution:</p>
														<p className="text-sm text-green-700 whitespace-pre-wrap">{notification.resolutionMessage}</p>
														<p className="text-xs text-green-600 mt-1">Resolved on: {formatDate(notification.resolvedAt!)}</p>
													</div>
												</>
											)}
										</div>
									))}
								</div>
							)}
						</CardContent>
						<CardFooter className="flex justify-between">
							<Button variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
								Previous
							</Button>
							<span className="text-sm text-muted-foreground">
								Page {page} of {totalPages}
							</span>
							<Button variant="outline" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
								Next
							</Button>
						</CardFooter>
					</Card>
				</TabsContent>

				<TabsContent value="send">
					<Card>
						<CardHeader>
							<CardTitle>Send Notification</CardTitle>
							<CardDescription>Send a notification to a specific user or all users</CardDescription>
						</CardHeader>
						<CardContent>
							{error && (
								<div className="bg-destructive/15 text-destructive p-3 rounded-md mb-4 flex items-center">
									<AlertCircle className="h-4 w-4 mr-2" />
									{error}
								</div>
							)}

							{success && (
								<div className="bg-green-500/15 text-green-500 p-3 rounded-md mb-4 flex items-center">
									<Check className="h-4 w-4 mr-2" />
									{success}
								</div>
							)}

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium mb-1">Recipient</label>
									<div className="space-y-2">
										<Select value={recipientType} onValueChange={(v) => {
											setRecipientType(v as RecipientType);
											setSelectedUser("");
											setUserSearch("");
										}}>
											<SelectTrigger>
												<SelectValue placeholder="Select recipient type" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All Users</SelectItem>
												<SelectItem value="editors">All Editors</SelectItem>
												<SelectItem value="annotators">All Annotators</SelectItem>
												<SelectItem value="admins">All Admins</SelectItem>
												<SelectItem value="user">Single User</SelectItem>
											</SelectContent>
										</Select>
										{recipientType === "user" && (
											<Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
												<PopoverTrigger asChild>
													<Button
														variant="outline"
														role="combobox"
														className="w-full justify-between font-normal"
													>
														{selectedUser ? (
															users.find((u) => u.userID === selectedUser)?.name ?? selectedUser
														) : (
															<span className="text-muted-foreground">Search and select a user...</span>
														)}
														<ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
													</Button>
												</PopoverTrigger>
												<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
													<div className="flex items-center border-b px-2">
														<Search className="h-4 w-4 shrink-0 text-muted-foreground" />
														<Input
															placeholder="Search by name or role..."
															value={userSearch}
															onChange={(e) => setUserSearch(e.target.value)}
															className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
														/>
													</div>
													<ScrollArea className="max-h-[280px]">
														{users
															.filter(
																(u) =>
																	!userSearch.trim() ||
																	u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
																	u.perms.toLowerCase().includes(userSearch.toLowerCase())
															)
															.map((user) => (
																<button
																	key={user.userID}
																	type="button"
																	className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
																	onClick={() => {
																		setSelectedUser(user.userID);
																		setUserSearch("");
																		setUserPopoverOpen(false);
																	}}
																>
																	{user.name} ({user.perms})
																</button>
															))}
														{users.filter(
															(u) =>
																!userSearch.trim() ||
																u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
																u.perms.toLowerCase().includes(userSearch.toLowerCase())
														).length === 0 && (
															<div className="py-6 text-center text-sm text-muted-foreground">
																No users found.
															</div>
														)}
													</ScrollArea>
												</PopoverContent>
											</Popover>
										)}
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium mb-1">Subject</label>
									<Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter notification subject" />
								</div>

								<div>
									<label className="block text-sm font-medium mb-1">Message</label>
									<Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Enter notification message" rows={5} />
								</div>

								<div className="flex items-center space-x-2">
									<Checkbox
										id="fixes-announcement"
										checked={isFixesAnnouncement}
										onCheckedChange={(checked) => setIsFixesAnnouncement(checked === true)}
									/>
									<label
										htmlFor="fixes-announcement"
										className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5"
									>
										<Megaphone className="h-4 w-4" />
										Fixes announcement (auto-delete after 7 days)
									</label>
								</div>
							</div>
						</CardContent>
						<CardFooter>
							<Button
								onClick={handleSendNotification}
								disabled={
									sending ||
									!subject.trim() ||
									!message.trim() ||
									(recipientType === "user" && !selectedUser)
								}
								className="w-full"
							>
								{sending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Sending...
									</>
								) : (
									<>
										<Send className="mr-2 h-4 w-4" />
										Send Notification
									</>
								)}
							</Button>
						</CardFooter>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
