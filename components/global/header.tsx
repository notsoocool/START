"use client";

import { ClerkLoaded, ClerkLoading, UserButton, SignInButton } from "@clerk/nextjs";
import { Loader2, Bell, Check } from "lucide-react";
import { Navigation } from "./navigation";
import { HeaderLogo } from "./header-logo";
import { Search } from "./search";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser, useNotifications, useMarkNotificationAsRead } from "@/lib/hooks/use-api";

interface Notification {
	_id: string;
	senderID: string;
	senderName: string;
	subject: string;
	message: string;
	isRead: boolean;
	createdAt: string;
	isErrorReport: boolean;
	isResolved: boolean;
}

export const Header = () => {
	const router = useRouter();
	const { data: currentUser } = useCurrentUser();
	const { data: notificationsData, isLoading: notificationsLoading } = useNotifications(1);
	const markAsReadMutation = useMarkNotificationAsRead();

	const notifications = notificationsData?.notifications || [];
	const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

	const handleMarkAsRead = async (notificationId: string, event: React.MouseEvent) => {
		event.stopPropagation(); // Prevent navigation when clicking the check button
		markAsReadMutation.mutate(notificationId);
	};

	const formatDate = (dateString: string) => {
		try {
			return format(new Date(dateString), "MMM d, h:mm a");
		} catch (error) {
			return dateString;
		}
	};

	const getViewAllLink = () => {
		if (currentUser?.perms === "Root") {
			return "/admin/notifications";
		}
		return "/notifications";
	};

	const handleNotificationClick = () => {
		const dropdown = document.getElementById("notifications-dropdown");
		if (dropdown) {
			dropdown.classList.add("hidden");
		}
		router.push(getViewAllLink());
	};

	return (
		<header className="sticky top-0 left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-4 py-3 lg:px-14 z-50 transition-all duration-300">
			<div className="max-w-screen-2xl mx-auto">
				<div className="w-full flex items-center justify-between">
					<div className="flex items-center lg:gap-x-16">
						<HeaderLogo />
						<Navigation />
					</div>
					<div className="flex items-center gap-6">
						<Search />
						<ClerkLoaded>
							{currentUser ? (
								<>
									<div className="relative">
										<Button
											variant="ghost"
											size="icon"
											className="relative"
											onClick={() => {
												const dropdown = document.getElementById("notifications-dropdown");
												if (dropdown) {
													dropdown.classList.toggle("hidden");
												}
											}}
										>
											<Bell className="h-5 w-5" />
											{unreadCount > 0 && (
												<Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
													{unreadCount}
												</Badge>
											)}
										</Button>
										<div
											id="notifications-dropdown"
											className="hidden absolute right-0 mt-2 w-80 bg-white dark:bg-gray-950 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800"
										>
											<div className="p-4 border-b border-gray-200 dark:border-gray-800">
												<div className="flex items-center justify-between">
													<h3 className="font-semibold">Notifications</h3>
													<Link href={getViewAllLink()}>
														<Button variant="ghost" size="sm" className="text-xs" data-navigate="true">
															View All
														</Button>
													</Link>
												</div>
											</div>
											<ScrollArea className="h-[400px]">
												{notificationsLoading ? (
													<div className="flex justify-center py-8">
														<Loader2 className="h-6 w-6 animate-spin text-primary" />
													</div>
												) : notifications.length === 0 ? (
													<div className="text-center py-8 text-muted-foreground text-sm">No notifications</div>
												) : (
													<div className="divide-y divide-gray-200 dark:divide-gray-800">
														{notifications.map((notification) => (
															<div
																key={notification._id}
																className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer ${
																	!notification.isRead ? "bg-muted/50" : ""
																}`}
																onClick={handleNotificationClick}
															>
																<div className="flex items-start justify-between">
																	<div className="space-y-1">
																		<div className="flex items-center gap-2">
																			<h4 className="text-sm font-medium">{notification.subject}</h4>
																			{notification.isErrorReport && (
																				<Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">
																					Error Report
																				</Badge>
																			)}
																			{notification.isResolved && (
																				<Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs">
																					Resolved
																				</Badge>
																			)}
																		</div>
																		<p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
																		<p className="text-xs text-muted-foreground">{formatDate(notification.createdAt)}</p>
																	</div>
																	{!notification.isRead && (
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-6 w-6"
																			onClick={(e) => handleMarkAsRead(notification._id, e)}
																			disabled={markAsReadMutation.isPending}
																		>
																			{markAsReadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
																		</Button>
																	)}
																</div>
															</div>
														))}
													</div>
												)}
											</ScrollArea>
										</div>
									</div>
									<UserButton
										afterSignOutUrl="/"
										appearance={{
											elements: {
												avatarBox: "w-9 h-9 rounded-full hover:ring-2 hover:ring-purple-500 transition-all duration-300",
											},
										}}
									/>
								</>
							) : (
								<SignInButton mode="modal">
									<Button variant="default" className="bg-purple-600 hover:bg-purple-700">
										Sign In
									</Button>
								</SignInButton>
							)}
						</ClerkLoaded>
						<ClerkLoading>
							<Loader2 className="size-8 animate-spin text-purple-500" />
						</ClerkLoading>
					</div>
				</div>
			</div>
		</header>
	);
};
