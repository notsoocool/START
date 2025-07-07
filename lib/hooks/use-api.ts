import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
interface User {
	id: string;
	firstName: string;
	lastName: string;
	perms: "User" | "Annotator" | "Editor" | "Admin" | "Root";
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

// API Functions
const fetchCurrentUser = async (): Promise<User> => {
	const response = await fetch("/api/getCurrentUser");
	if (!response.ok) {
		throw new Error("Failed to fetch current user");
	}
	return response.json();
};

const fetchNotifications = async (page: number = 1): Promise<{ notifications: Notification[]; pagination: any }> => {
	const response = await fetch(`/api/notifications/get?page=${page}`);
	if (!response.ok) {
		throw new Error("Failed to fetch notifications");
	}
	return response.json();
};

const markNotificationAsRead = async (notificationId: string): Promise<void> => {
	const response = await fetch("/api/notifications/markRead", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ notificationId }),
	});
	if (!response.ok) {
		throw new Error("Failed to mark notification as read");
	}
};

// Custom Hooks
export function useCurrentUser() {
	return useQuery({
		queryKey: ["currentUser"],
		queryFn: fetchCurrentUser,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

export function useNotifications(page: number = 1) {
	const { data: currentUser } = useCurrentUser();

	return useQuery({
		queryKey: ["notifications", page],
		queryFn: () => fetchNotifications(page),
		staleTime: 30 * 1000, // 30 seconds
		enabled: !!currentUser, // Only run when user is loaded
		retry: (failureCount, error) => {
			console.error("Notifications query error:", error);
			return failureCount < 2;
		},
	});
}

export function useMarkNotificationAsRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: markNotificationAsRead,
		onSuccess: (_, notificationId) => {
			// Update all notification queries in the cache
			queryClient.setQueriesData({ queryKey: ["notifications"] }, (old: any) => {
				if (!old) return old;
				return {
					...old,
					notifications: old.notifications.map((n: Notification) => (n._id === notificationId ? { ...n, isRead: true } : n)),
				};
			});
		},
	});
}

// Add more hooks as needed for other API endpoints
export function useBooks() {
	return useQuery({
		queryKey: ["books"],
		queryFn: async () => {
			const response = await fetch("/api/books");
			if (!response.ok) throw new Error("Failed to fetch books");
			return response.json();
		},
		staleTime: 5 * 60 * 1000, // 5 minutes - books don't change often
	});
}

export function useBookmarks() {
	return useQuery({
		queryKey: ["bookmarks"],
		queryFn: async () => {
			const response = await fetch("/api/bookmarks");
			if (!response.ok) throw new Error("Failed to fetch bookmarks");
			return response.json();
		},
		staleTime: 30 * 1000, // 30 seconds
	});
}

export function useToggleBookmark() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ shlokaId, analysisId }: { shlokaId: string; analysisId: string }) => {
			const response = await fetch("/api/bookmarks", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
				body: JSON.stringify({ shlokaId, analysisId }),
			});
			if (!response.ok) throw new Error("Failed to toggle bookmark");
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
		},
	});
}

export function useShlokas(book: string, part1: string, part2: string, chaptno: string) {
	return useQuery({
		queryKey: ["shlokas", book, part1, part2, chaptno],
		queryFn: async () => {
			const response = await fetch(`/api/books/${book}/${part1}/${part2}/${chaptno}`);
			if (!response.ok) throw new Error("Failed to fetch shlokas");
			return response.json();
		},
		staleTime: 5 * 60 * 1000, // 5 minutes - shlokas don't change often
		enabled: !!(book && part1 && part2 && chaptno), // Only run when all params are available
	});
}
