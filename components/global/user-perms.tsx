// app/Admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // Import useRouter for navigation
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type User = {
	userID: string;
	name: string;
	perms: "User" | "Annotator" | "Editor" | "Admin" | "Root"; // Include Root in User type
};

export default function UserPerms() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentUser, setCurrentUser] = useState<{
		id: string;
		firstName: string;
		lastName: string;
		perms: User["perms"];
	} | null>(null); // Updated type for current user
	const router = useRouter(); // Initialize useRouter

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [searchTerm, setSearchTerm] = useState("");
	const [usersPerPage, setUsersPerPage] = useState(10);

	const fetchUsers = async (page: number, search: string = "") => {
		setLoading(true);
		try {
			const response = await fetch(`/api/getAllUsers?page=${page}&limit=${usersPerPage}&search=${search}`);

			if (!response.ok) {
				const data = await response.json();
				setError(data.error);
				return;
			}

			const data = await response.json();
			setUsers(data.users);
			setTotalPages(data.pagination.pages);
			setCurrentPage(data.pagination.currentPage);
		} catch (error) {
			setError("Failed to fetch users");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchUsers(currentPage, searchTerm);
	}, [currentPage, searchTerm, usersPerPage]);

	useEffect(() => {
		const fetchCurrentUser = async () => {
			const response = await fetch("/api/getCurrentUser");

			if (!response.ok) {
				console.error("Error fetching current user");
				return;
			}

			const data = await response.json();
			setCurrentUser(data); // Set current user data with updated structure
		};

		fetchCurrentUser();
	}, [router]);

	const handlePermissionChange = async (userId: string, newPermission: User["perms"]) => {
		const response = await fetch(`/api/updateUser`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ userId, newPermission }),
		});

		if (response.ok) {
			setUsers((prevUsers) => prevUsers.map((user) => (user.userID === userId ? { ...user, perms: newPermission } : user)));
		} else {
			const data = await response.json();
			alert(`Error: ${data.error}`);
		}
	};

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

	if (loading) return <p>Loading...</p>;
	if (error) return <p>Error: {error}</p>;

	return (
		<div className="container mx-auto py-10">
			<div className="mb-4">
				<Input type="search" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
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
					{users.map((user) => (
						<TableRow key={user.userID}>
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
									} // Disable if user is Admin and current user is not Root
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
										</SelectItem>{" "}
										{/* Mark Root as danger */}
									</SelectContent>
								</Select>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<Pagination />
		</div>
	);
}
