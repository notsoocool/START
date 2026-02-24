// app/Admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // Import useRouter for navigation
import { motion, AnimatePresence } from "framer-motion";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUsers } from "@/lib/hooks/use-api";
import { Loader2, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type User = {
	userID: string;
	name: string;
	perms: "User" | "Annotator" | "Editor" | "Admin" | "Root"; // Include Root in User type
};

interface UsersApiResponse {
	users: User[];
	total: number;
	countsByRole?: {
		User: number;
		Annotator: number;
		Editor: number;
		Admin: number;
		Root: number;
	};
}

interface Group {
	_id: string;
	name: string;
	type: "A" | "B";
	members: string[];
	assignedBooks: string[];
	supervisedGroups?: string[] | Group[];
}

interface UserPermsProps {
	changeTab: (tabName: string) => void;
}

export default function UserPerms({ changeTab }: UserPermsProps) {
	console.log("UserPerms component rendered with changeTab:", changeTab);

	const [currentPage, setCurrentPage] = useState(1);
	const [usersPerPage, setUsersPerPage] = useState(10);
	const [searchTerm, setSearchTerm] = useState("");
	const [roleFilter, setRoleFilter] = useState<string | null>(null);
	const { data, isLoading, error, refetch } = useUsers(
		currentPage,
		usersPerPage,
		searchTerm,
		roleFilter || undefined
	) as {
		data: UsersApiResponse;
		isLoading: boolean;
		error: any;
		refetch: () => void;
	};
	const users = data?.users || [];
	const total = data?.total || 0;
	const countsByRole = data?.countsByRole || {
		User: 0,
		Annotator: 0,
		Editor: 0,
		Admin: 0,
		Root: 0,
	};
	const [currentUser, setCurrentUser] = useState<{
		id: string;
		firstName: string;
		lastName: string;
		perms: User["perms"];
	} | null>(null);
	const [groups, setGroups] = useState<Group[]>([]);
	const [userGroups, setUserGroups] = useState<{ [userId: string]: Group[] }>(
		{}
	);
	const router = useRouter();

	// Reset to page 1 when search term or role filter changes
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, roleFilter]);

	useEffect(() => {
		const fetchCurrentUser = async () => {
			const response = await fetch("/api/getCurrentUser");
			if (!response.ok) {
				console.error("Error fetching current user");
				return;
			}
			const data = await response.json();
			setCurrentUser(data);
		};
		fetchCurrentUser();
	}, [router]);

	// Fetch groups and map users to their groups
	useEffect(() => {
		const fetchGroups = async () => {
			try {
				const response = await fetch("/api/groups");
				if (!response.ok) throw new Error("Failed to fetch groups");
				const groupsData = await response.json();
				setGroups(groupsData);

				// Map users to their groups
				const userGroupMap: { [userId: string]: Group[] } = {};
				users.forEach((user: User) => {
					const userGroups = groupsData.filter((group: Group) =>
						group.members.includes(user.userID)
					);
					userGroupMap[user.userID] = userGroups;
				});
				setUserGroups(userGroupMap);
			} catch (error) {
				console.error("Error fetching groups:", error);
			}
		};

		if (users.length > 0) {
			fetchGroups();
		}
	}, [users]);

	const handlePermissionChange = async (
		userId: string,
		newPermission: User["perms"]
	) => {
		// Check if user belongs to any group
		const userGroupsList = userGroups[userId] || [];

		if (userGroupsList.length > 0) {
			// User is in a group, permission change is blocked
			// Navigate to group admin tab and highlight the group
			window.sessionStorage.setItem(
				"highlightGroup",
				userGroupsList[0]._id
			);
			changeTab("group");
			toast.success("Navigated to Group Administration");
			return;
		}

		// Proceed with permission change if user is not in any group
		const response = await fetch(`/api/updateUser`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
			},
			body: JSON.stringify({ userId, newPermission }),
		});
		if (response.ok) {
			toast.success("Permission updated successfully!");
			await refetch(); // Refetch users from backend
		} else {
			const data = await response.json();
			toast.error(`Error: ${data.error}`);
		}
	};

	const totalPages = Math.ceil(total / usersPerPage);

	// Add pagination controls
	const Pagination = () => (
		<div className="flex items-center justify-between px-4 py-3 sm:px-6">
			<div className="flex flex-1 justify-between sm:hidden">
				<Button
					onClick={() =>
						setCurrentPage((prev) => Math.max(1, prev - 1))
					}
					disabled={currentPage === 1}
					variant="outline"
				>
					Previous
				</Button>
				<Button
					onClick={() =>
						setCurrentPage((prev) => Math.min(totalPages, prev + 1))
					}
					disabled={currentPage === totalPages}
					variant="outline"
				>
					Next
				</Button>
			</div>
			<div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
				<div>
					<p className="text-sm text-gray-700">
						Page <span className="font-medium">{currentPage}</span>{" "}
						of <span className="font-medium">{totalPages}</span>
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Select
						value={usersPerPage.toString()}
						onValueChange={(value) =>
							setUsersPerPage(parseInt(value))
						}
					>
						<SelectTrigger className="w-[100px]">
							<SelectValue placeholder="Per page" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="10">10</SelectItem>
							<SelectItem value="20">20</SelectItem>
							<SelectItem value="50">50</SelectItem>
							<SelectItem value="100">100</SelectItem>
						</SelectContent>
					</Select>
					<div className="flex gap-2">
						<Button
							onClick={() => setCurrentPage(1)}
							disabled={currentPage === 1}
							variant="outline"
						>
							First
						</Button>
						<Button
							onClick={() =>
								setCurrentPage((prev) => Math.max(1, prev - 1))
							}
							disabled={currentPage === 1}
							variant="outline"
						>
							Previous
						</Button>
						<Button
							onClick={() =>
								setCurrentPage((prev) =>
									Math.min(totalPages, prev + 1)
								)
							}
							disabled={currentPage === totalPages}
							variant="outline"
						>
							Next
						</Button>
						<Button
							onClick={() => setCurrentPage(totalPages)}
							disabled={currentPage === totalPages}
							variant="outline"
						>
							Last
						</Button>
					</div>
				</div>
			</div>
		</div>
	);

	if (isLoading) {
		return (
			<div className="flex justify-center py-8">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}
	if (error) {
		return <div className="text-red-500">Failed to load users</div>;
	}

	return (
		<div className="space-y-4">
			<div className="rounded-lg border bg-muted/30 p-4 space-y-3">
				<div className="flex items-center gap-2">
					<Users className="h-5 w-5 text-muted-foreground" />
					<span className="text-sm font-medium text-muted-foreground">Total Users</span>
					<span className="text-2xl font-bold tabular-nums">{total}</span>
				</div>
				<div className="flex flex-wrap gap-2">
					{[
						{
							label: "All",
							value: null,
							count:
								countsByRole.User +
								countsByRole.Editor +
								countsByRole.Annotator +
								countsByRole.Admin +
								countsByRole.Root,
							className: "bg-background",
						},
						{ label: "User", value: "User", count: countsByRole.User, className: "bg-background" },
						{ label: "Editor", value: "Editor", count: countsByRole.Editor, className: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
						{ label: "Annotator", value: "Annotator", count: countsByRole.Annotator, className: "bg-green-500/10 text-green-700 dark:text-green-300" },
						{ label: "Admin", value: "Admin", count: countsByRole.Admin, className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
						{ label: "Root", value: "Root", count: countsByRole.Root, className: "bg-purple-500/10 text-purple-700 dark:text-purple-300" },
					].map(({ label, value, count, className }) => {
						const isActive = roleFilter === value;
						return (
							<button
								key={label}
								type="button"
								onClick={() => setRoleFilter(isActive ? null : value)}
								className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer hover:opacity-90 ${className} ${
									isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
								}`}
							>
								<span className="text-muted-foreground">{label}</span>
								<span className="tabular-nums">{value === null ? total : count}</span>
							</button>
						);
					})}
				</div>
			</div>
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<Input
					type="search"
					placeholder="Search users..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="max-w-sm"
				/>
				<Button onClick={() => refetch()} variant="outline" size="sm">
					<Loader2 className="h-4 w-4 mr-2" />
					Refresh
				</Button>
			</div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Current Permission</TableHead>
						<TableHead>Group Status</TableHead>
						<TableHead>Change Permission</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					<AnimatePresence mode="wait">
						{users.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={4}
									className="text-center py-4"
								>
									{searchTerm
										? "No users found matching your search"
										: "No users found"}
								</TableCell>
							</TableRow>
						) : (
							users.map((user: User, index: number) => {
								const userGroupsList =
									userGroups[user.userID] || [];
								const isInGroup = userGroupsList.length > 0;

								return (
									<motion.tr
										key={user.userID}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.3,
											delay: index * 0.05,
											ease: "easeOut",
										}}
									>
										<TableCell>{user.name}</TableCell>
										<TableCell>
											{user.perms === "Root"
												? "Root"
												: user.perms}
										</TableCell>
										<TableCell>
											{isInGroup ? (
												<div className="space-y-2">
													<div
														className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
														onClick={() => {
															console.log(
																"Group status clicked, group ID:",
																userGroupsList[0]
																	._id
															);
															window.sessionStorage.setItem(
																"highlightGroup",
																userGroupsList[0]
																	._id
															);
															console.log(
																"changeTab function:",
																changeTab
															);
															changeTab("group");
															console.log(
																"changeTab called with 'group'"
															);
														}}
														title="Click to go to Group Administration"
													>
														<Users className="h-4 w-4 text-blue-500" />
														<span className="text-sm text-blue-600 hover:text-blue-700">
															In{" "}
															{
																userGroupsList.length
															}{" "}
															group(s)
														</span>
														<span className="text-xs text-muted-foreground ml-1">
															(Click to manage)
														</span>
													</div>

													{/* Show specific group names */}
													<div className="flex flex-wrap gap-1">
														{userGroupsList.map(
															(group, index) => (
																<button
																	key={
																		group._id
																	}
																	onClick={() => {
																		console.log(
																			"Group button clicked, group ID:",
																			group._id
																		);
																		window.sessionStorage.setItem(
																			"highlightGroup",
																			group._id
																		);
																		console.log(
																			"changeTab function:",
																			changeTab
																		);
																		changeTab(
																			"group"
																		);
																		console.log(
																			"changeTab called with 'group'"
																		);
																	}}
																	className="text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full cursor-pointer transition-colors"
																	title={`Click to manage ${group.name} group`}
																>
																	{group.name}
																</button>
															)
														)}
													</div>
												</div>
											) : (
												<span className="text-sm text-gray-500">
													No group
												</span>
											)}
										</TableCell>
										<TableCell>
											<Select
												value={user.perms}
												onValueChange={(value) =>
													handlePermissionChange(
														user.userID,
														value as User["perms"]
													)
												}
												disabled={
													(user.perms === "Admin" &&
														currentUser?.perms !==
															"Root") ||
													(user.perms === "Root" &&
														currentUser?.perms ===
															"Root") ||
													(user.perms === "Root" &&
														currentUser?.perms ===
															"Admin") ||
													isInGroup // Disable if user is in a group
												}
											>
												<SelectTrigger className="w-[180px]">
													<SelectValue placeholder="Select permission" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="User">
														User
													</SelectItem>
													<SelectItem value="Annotator">
														Annotator
													</SelectItem>
													<SelectItem value="Editor">
														Editor
													</SelectItem>
													<SelectItem
														value="Admin"
														disabled={
															currentUser?.perms !==
															"Root"
														}
													>
														Admin
													</SelectItem>
													<SelectItem
														value="Root"
														disabled
														className="text-red-500"
													>
														Root
													</SelectItem>
												</SelectContent>
											</Select>
											{isInGroup && (
												<p className="text-xs text-red-500 mt-1">
													Remove from group first
												</p>
											)}
										</TableCell>
									</motion.tr>
								);
							})
						)}
					</AnimatePresence>
				</TableBody>
			</Table>
			<Pagination />
		</div>
	);
}
