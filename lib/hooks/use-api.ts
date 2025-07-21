import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";

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

// New types for additional endpoints
interface ShlokaAnalysis {
	_id: string;
	chaptno: string;
	slokano: string;
	sentno: string;
	[key: string]: any;
}

interface Shloka {
	_id: string;
	slokano: string;
	spart: string;
	[key: string]: any;
}

interface Discussion {
	_id: string;
	shlokaId: string;
	userId: string;
	userName: string;
	message: string;
	createdAt: string;
}

interface UserPerm {
	userID: string;
	name: string;
	perms: string;
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

// 1. Analysis for a shloka
export function useShlokaAnalysis(book: string, part1: string, part2: string, chaptno: string, slokano: string) {
	return useQuery({
		queryKey: ["shlokaAnalysis", book, part1, part2, chaptno, slokano],
		queryFn: async () => {
			const response = await fetch(`/api/analysis/${book}/${part1}/${part2}/${chaptno}/${slokano}`);
			if (!response.ok) throw new Error("Failed to fetch shloka analysis");
			return response.json();
		},
		enabled: !!(book && part1 && part2 && chaptno && slokano),
	});
}

// 2. Get a single shloka by ID
export function useShlokaById(id: string) {
	return useQuery({
		queryKey: ["shlokaById", id],
		queryFn: async () => {
			const response = await fetch(`/api/ahShloka/${id}`);
			if (!response.ok) throw new Error("Failed to fetch shloka by id");
			return response.json();
		},
		enabled: !!id,
	});
}

// 3. Discussions for a shloka
export function useDiscussions(shlokaId: string) {
	return useQuery({
		queryKey: ["discussions", shlokaId],
		queryFn: async () => {
			const response = await fetch(`/api/discussions?shlokaId=${shlokaId}`);
			if (!response.ok) throw new Error("Failed to fetch discussions");
			return response.json();
		},
		enabled: !!shlokaId,
		staleTime: 30 * 1000,
	});
}

export function useAddDiscussion() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { shlokaId: string; message: string }) => {
			const response = await fetch("/api/discussions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) throw new Error("Failed to add discussion");
			return response.json();
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["discussions", variables.shlokaId] });
		},
	});
}

// 4. User list/permissions
export function useUsers(page: number = 1, limit: number = 10) {
	return useQuery({
		queryKey: ["users", page, limit],
		queryFn: async () => {
			const response = await fetch(`/api/users?page=${page}&limit=${limit}`);
			if (!response.ok) throw new Error("Failed to fetch users");
			return response.json();
		},
		staleTime: 5 * 60 * 1000,
		placeholderData: keepPreviousData,
	});
}

// 5. History
export function useHistory(page: number = 1, limit: number = 20) {
	return useQuery({
		queryKey: ["history", page, limit],
		queryFn: async () => {
			const response = await fetch(`/api/history?page=${page}&limit=${limit}`);
			if (!response.ok) throw new Error("Failed to fetch history");
			return response.json();
		},
		staleTime: 60 * 1000,
	});
}

// 6. Shlokas by group/search
export function useGroupShlokas(groupId: string, search: string = "") {
	return useQuery({
		queryKey: ["groupShlokas", groupId, search],
		queryFn: async () => {
			const params = new URLSearchParams({ groupId });
			if (search) params.append("search", search);
			const response = await fetch(`/api/shlokas?${params.toString()}`);
			if (!response.ok) throw new Error("Failed to fetch group shlokas");
			return response.json();
		},
		enabled: !!groupId,
		staleTime: 5 * 60 * 1000,
	});
}

// 7. Book publishing status
export function useBookStatus() {
	return useQuery({
		queryKey: ["bookStatus"],
		queryFn: async () => {
			const response = await fetch("/api/books/status");
			if (!response.ok) throw new Error("Failed to fetch book status");
			return response.json();
		},
		staleTime: 5 * 60 * 1000,
	});
}

// Add useGroups
export function useGroups() {
	return useQuery({
		queryKey: ["groups"],
		queryFn: async () => {
			const response = await fetch("/api/groups");
			if (!response.ok) throw new Error("Failed to fetch groups");
			return response.json();
		},
		staleTime: 5 * 60 * 1000,
	});
}

// Add usePublishShloka
export function usePublishShloka() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ shlokaId, field, value, groupId }: { shlokaId: string; field: string; value: boolean; groupId: string }) => {
			const response = await fetch("/api/shlokas/publish", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ shlokaId, field, value, groupId }),
			});
			if (!response.ok) throw new Error("Failed to update publish status");
			return response.json();
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["groupShlokas", variables.groupId] });
		},
	});
}
