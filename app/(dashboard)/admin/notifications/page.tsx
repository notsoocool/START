"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send, Mail, Check, AlertCircle } from "lucide-react";
import { format } from "date-fns";

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
}

export default function NotificationsPage() {
	const router = useRouter();
	const [users, setUsers] = useState<User[]>([]);
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const [currentUser, setCurrentUser] = useState<{ id: string; perms: string } | null>(null);
	const [selectedUser, setSelectedUser] = useState<string>("all");
	const [subject, setSubject] = useState("");
	const [message, setMessage] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState("send");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

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
				const response = await fetch("/api/getAllUsers?limit=100");
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

	// Fetch notifications
	useEffect(() => {
		const fetchNotifications = async () => {
			try {
				setLoading(true);
				const response = await fetch(`/api/notifications/get?page=${page}`);
				const data = await response.json();

				if (response.ok) {
					setNotifications(data.notifications);
					setTotalPages(data.pagination.pages);
				} else {
					console.error("Error fetching notifications:", data.error);
				}
			} catch (error) {
				console.error("Error fetching notifications:", error);
			} finally {
				setLoading(false);
			}
		};

		if (currentUser) {
			fetchNotifications();
		}
	}, [currentUser, page]);

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
					recipientID: selectedUser === "all" ? null : selectedUser,
					subject,
					message,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				setSuccess("Notification sent successfully!");
				setSubject("");
				setMessage("");
				setSelectedUser("all");

				// Refresh notifications
				const notifResponse = await fetch(`/api/notifications/get?page=${page}`);
				const notifData = await notifResponse.json();

				if (notifResponse.ok) {
					setNotifications(notifData.notifications);
				}
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
				// Update the local state to mark the notification as read
				setNotifications(notifications.map((notification) => (notification._id === notificationId ? { ...notification, isRead: true } : notification)));
			}
		} catch (error) {
			console.error("Error marking notification as read:", error);
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
			<h1 className="text-3xl font-bold mb-6">Notifications</h1>

			<Tabs defaultValue="send" value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="mb-6">
					<TabsTrigger value="send">Send Notification</TabsTrigger>
					<TabsTrigger value="view">View Notifications</TabsTrigger>
				</TabsList>

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
									<Select value={selectedUser || "all"} onValueChange={setSelectedUser}>
										<SelectTrigger>
											<SelectValue placeholder="Select a user or send to all" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Users</SelectItem>
											{users.map((user) => (
												<SelectItem key={user.userID} value={user.userID}>
													{user.name} ({user.perms})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<label className="block text-sm font-medium mb-1">Subject</label>
									<Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter notification subject" />
								</div>

								<div>
									<label className="block text-sm font-medium mb-1">Message</label>
									<Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Enter notification message" rows={5} />
								</div>
							</div>
						</CardContent>
						<CardFooter>
							<Button onClick={handleSendNotification} disabled={sending || !subject.trim() || !message.trim()} className="w-full">
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

				<TabsContent value="view">
					<Card>
						<CardHeader>
							<CardTitle>Notifications</CardTitle>
							<CardDescription>View all notifications sent and received</CardDescription>
						</CardHeader>
						<CardContent>
							{loading ? (
								<div className="flex justify-center py-8">
									<Loader2 className="h-8 w-8 animate-spin text-primary" />
								</div>
							) : notifications.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">No notifications found</div>
							) : (
								<div className="space-y-4">
									{notifications.map((notification) => (
										<div key={notification._id} className={`p-4 rounded-lg border ${notification.isRead ? "bg-background" : "bg-muted/50"}`}>
											<div className="flex justify-between items-start">
												<div>
													<h3 className="font-medium">{notification.subject}</h3>
													<p className="text-sm text-muted-foreground">
														From: {notification.senderName}
														{notification.recipientID ? ` To: ${notification.recipientName || "Specific User"}` : " To: All Users"}
													</p>
													<p className="text-xs text-muted-foreground mt-1">{formatDate(notification.createdAt)}</p>
												</div>
												<div className="flex items-center space-x-2">
													{notification.isFromUser && (
														<Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
															From User
														</Badge>
													)}
													{notification.recipientID && (
														<Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
															Private Message
														</Badge>
													)}
													{!notification.isRead && (
														<Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(notification._id)}>
															<Check className="h-4 w-4" />
														</Button>
													)}
												</div>
											</div>
											<Separator className="my-2" />
											<p className="whitespace-pre-wrap">{notification.message}</p>
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
			</Tabs>
		</div>
	);
}
