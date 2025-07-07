"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send, Check, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser, useNotifications, useMarkNotificationAsRead } from "@/lib/hooks/use-api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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

export default function UserNotificationsPage() {
	const [subject, setSubject] = useState("");
	const [message, setMessage] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState("view");
	const [page, setPage] = useState(1);

	const { data: currentUser, isLoading: userLoading } = useCurrentUser();
	const { data: notificationsData, isLoading: notificationsLoading } = useNotifications(page);
	const markAsReadMutation = useMarkNotificationAsRead();
	const queryClient = useQueryClient();

	// Send message mutation
	const sendMessageMutation = useMutation({
		mutationFn: async ({ subject, message }: { subject: string; message: string }) => {
			const response = await fetch("/api/notifications/send", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					recipientID: "admin", // Send to Root users only
					subject,
					message,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to send message");
			}

			return response.json();
		},
		onSuccess: () => {
			setSuccess("Message sent successfully!");
			setSubject("");
			setMessage("");
			setError(null);
			// Invalidate and refetch notifications
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
		},
		onError: (error: Error) => {
			setError(error.message);
			setSuccess(null);
		},
	});

	const handleSendMessage = async () => {
		if (!subject.trim() || !message.trim()) {
			setError("Subject and message are required");
			return;
		}

		setError(null);
		setSuccess(null);
		sendMessageMutation.mutate({ subject, message });
	};

	const handleMarkAsRead = (notificationId: string) => {
		markAsReadMutation.mutate(notificationId);
	};

	const formatDate = (dateString: string) => {
		try {
			return format(new Date(dateString), "MMM d, yyyy h:mm a");
		} catch (error) {
			return dateString;
		}
	};

	if (userLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!currentUser) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
					<p>Unable to load user data</p>
				</div>
			</div>
		);
	}

	const notifications = notificationsData?.notifications || [];
	const totalPages = notificationsData?.pagination?.pages || 1;

	return (
		<div className="container mx-auto py-8">
			<h1 className="text-3xl font-bold mb-6">Notifications</h1>

			<Tabs defaultValue="view" value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="mb-6">
					<TabsTrigger value="view">View Notifications</TabsTrigger>
					<TabsTrigger value="contact">Contact Admin</TabsTrigger>
				</TabsList>

				<TabsContent value="view">
					<Card>
						<CardHeader>
							<CardTitle>Your Notifications</CardTitle>
							<CardDescription>View notifications sent to you</CardDescription>
						</CardHeader>
						<CardContent>
							{notificationsLoading ? (
								<div className="flex justify-center py-8">
									<Loader2 className="h-8 w-8 animate-spin text-primary" />
								</div>
							) : notifications.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">No notifications found</div>
							) : (
								<div className="space-y-4">
									{notifications.map((notification: Notification) => (
										<div key={notification._id} className={`p-4 rounded-lg border ${notification.isRead ? "bg-background" : "bg-muted/50"}`}>
											<div className="flex justify-between items-start">
												<div>
													<h3 className="font-medium">{notification.subject}</h3>
													<p className="text-sm text-muted-foreground">From: {notification.senderName}</p>
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
													{!notification.isRead && (
														<Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(notification._id)} disabled={markAsReadMutation.isPending}>
															{markAsReadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
														</Button>
													)}
												</div>
											</div>
											<Separator className="my-2" />
											<p className="whitespace-pre-wrap">{notification.message}</p>
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

				<TabsContent value="contact">
					<Card>
						<CardHeader>
							<CardTitle>Contact Admin</CardTitle>
							<CardDescription>Send a message to the administrator</CardDescription>
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
									<label className="block text-sm font-medium mb-1">Subject</label>
									<Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter message subject" />
								</div>

								<div>
									<label className="block text-sm font-medium mb-1">Message</label>
									<Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Enter your message to the administrator" rows={5} />
								</div>
							</div>
						</CardContent>
						<CardFooter>
							<Button onClick={handleSendMessage} disabled={sendMessageMutation.isPending || !subject.trim() || !message.trim()} className="w-full">
								{sendMessageMutation.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Sending...
									</>
								) : (
									<>
										<Send className="mr-2 h-4 w-4" />
										Send Message
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
