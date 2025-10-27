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
	const { data, isLoading, error, refetch } = useUsers(
		currentPage,
		usersPerPage,
		searchTerm
	) as {
		data: UsersApiResponse;
		isLoading: boolean;
		error: any;
		refetch: () => void;
	};
	const users = data?.users || [];
	const total = data?.total || 0;
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

	// Reset to page 1 when search term changes
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm]);

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
		<div className="container mx-auto py-10">
			<div className="flex justify-between items-center mb-4">
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
