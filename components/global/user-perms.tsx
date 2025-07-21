// app/Admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // Import useRouter for navigation
import { motion, AnimatePresence } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUsers } from "@/lib/hooks/use-api";
import { Loader2 } from "lucide-react";

type User = {
	userID: string;
	name: string;
	perms: "User" | "Annotator" | "Editor" | "Admin" | "Root"; // Include Root in User type
};

interface UsersApiResponse {
	users: User[];
	total: number;
}

export default function UserPerms() {
	const [currentPage, setCurrentPage] = useState(1);
	const [usersPerPage, setUsersPerPage] = useState(10);
	const { data, isLoading, error, refetch } = useUsers(currentPage, usersPerPage) as {
		data: UsersApiResponse;
		isLoading: boolean;
		error: any;
		refetch: () => void;
	};
	const users = data?.users || [];
	const total = data?.total || 0;
	const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
	const [currentUser, setCurrentUser] = useState<{
		id: string;
		firstName: string;
		lastName: string;
		perms: User["perms"];
	} | null>(null);
	const router = useRouter();
	const [searchTerm, setSearchTerm] = useState("");
	const [searchValue, setSearchValue] = useState("");

	// Update filteredUsers when users or search changes
	useEffect(() => {
		if (searchTerm) {
			setFilteredUsers(users.filter((user: User) => user.name?.toLowerCase().includes(searchTerm.toLowerCase())));
		} else {
			setFilteredUsers(users);
		}
	}, [users, searchTerm]);

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

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setSearchValue(value);
		setSearchTerm(value);
	};

	const handlePermissionChange = async (userId: string, newPermission: User["perms"]) => {
		const response = await fetch(`/api/updateUser`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
			},
			body: JSON.stringify({ userId, newPermission }),
		});
		if (response.ok) {
			await refetch(); // Refetch users from backend
		} else {
			const data = await response.json();
			alert(`Error: ${data.error}`);
		}
	};

	const totalPages = Math.ceil(total / usersPerPage);

	// Add pagination controls
	const Pagination = () => (
		<div className="flex items-center justify-between px-4 py-3 sm:px-6">
			<div className="flex flex-1 justify-between sm:hidden">
				<Button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} variant="outline">
					Previous
				</Button>
				<Button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} variant="outline">
					Next
				</Button>
			</div>
			<div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
				<div>
					<p className="text-sm text-gray-700">
						Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Select value={usersPerPage.toString()} onValueChange={(value) => setUsersPerPage(parseInt(value))}>
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
						<Button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} variant="outline">
							First
						</Button>
						<Button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} variant="outline">
							Previous
						</Button>
						<Button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} variant="outline">
							Next
						</Button>
						<Button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} variant="outline">
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
			<div className="mb-4">
				<Input type="search" placeholder="Search users..." value={searchValue} onChange={handleSearchChange} className="max-w-sm" />
			</div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Current Permission</TableHead>
						<TableHead>Change Permission</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					<AnimatePresence mode="wait">
						{filteredUsers.length === 0 ? (
							<TableRow>
								<TableCell colSpan={3} className="text-center py-4">
									No users found
								</TableCell>
							</TableRow>
						) : (
							filteredUsers.map((user: User, index: number) => (
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
									<TableCell>{user.perms === "Root" ? "Root" : user.perms}</TableCell>
									<TableCell>
										<Select
											value={user.perms}
											onValueChange={(value) => handlePermissionChange(user.userID, value as User["perms"])}
											disabled={
												(user.perms === "Admin" && currentUser?.perms !== "Root") ||
												(user.perms === "Root" && currentUser?.perms === "Root") ||
												(user.perms === "Root" && currentUser?.perms === "Admin")
											}
										>
											<SelectTrigger className="w-[180px]">
												<SelectValue placeholder="Select permission" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="User">User</SelectItem>
												<SelectItem value="Annotator">Annotator</SelectItem>
												<SelectItem value="Editor">Editor</SelectItem>
												<SelectItem value="Admin" disabled={currentUser?.perms !== "Root"}>
													Admin
												</SelectItem>
												<SelectItem value="Root" disabled className="text-red-500">
													Root
												</SelectItem>
											</SelectContent>
										</Select>
									</TableCell>
								</motion.tr>
							))
						)}
					</AnimatePresence>
				</TableBody>
			</Table>
			<Pagination />
		</div>
	);
}
