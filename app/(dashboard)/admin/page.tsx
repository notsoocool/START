// app/Admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // Import useRouter for navigation
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

type User = {
	userID: string;
	name: string;
	perms: "User" | "Annotator" | "Editor" | "Admin" | "Root"; // Include Root in User type
};

export default function adminPanel() {
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

	useEffect(() => {
		const fetchUsers = async () => {
			const response = await fetch("/api/getAllUsers");

			if (!response.ok) {
				const data = await response.json();
				setError(data.error);
				setLoading(false);
				return;
			}

			const data = await response.json();
			setUsers(data);
			setLoading(false);
		};

		fetchUsers();
	}, []);

	useEffect(() => {
		const fetchCurrentUser = async () => {
			const response = await fetch("/api/getCurrentUser");

			if (!response.ok) {
				console.error("Error fetching current user");
				return;
			}

			const data = await response.json();
			setCurrentUser(data); // Set current user data with updated structure

			// Redirect if current user is not Admin or Root
			if (data.perms !== "Admin" && data.perms !== "Root") {
				router.push("/"); // Redirect to main page
			}
		};

		fetchCurrentUser();
	}, [router]);

	const handlePermissionChange = async (
		userId: string,
		newPermission: User["perms"]
	) => {
		const response = await fetch(`/api/updateUser`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ userId, newPermission }),
		});

		if (response.ok) {
			setUsers((prevUsers) =>
				prevUsers.map((user) =>
					user.userID === userId
						? { ...user, perms: newPermission }
						: user
				)
			);
		} else {
			const data = await response.json();
			alert(`Error: ${data.error}`);
		}
	};

	if (loading) return <p>Loading...</p>;
	if (error) return <p>Error: {error}</p>;

	return (
		<div className="container mx-auto py-10">
			<h1 className="text-2xl font-bold mb-5">User Management</h1>
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
							<TableCell>
								{user.perms === "Root" ? "Root" : user.perms}
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
											currentUser?.perms !== "Root") ||
										(user.perms === "Root" &&
											currentUser?.perms === "Root") ||
										(user.perms === "Root" &&
											currentUser?.perms === "Admin")
									} // Disable if user is Admin and current user is not Root
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
												currentUser?.perms !== "Root"
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
										</SelectItem>{" "}
										{/* Mark Root as danger */}
									</SelectContent>
								</Select>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
