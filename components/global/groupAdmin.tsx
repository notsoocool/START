"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Group from "@/lib/db/groupModel";
import Perms from "@/lib/db/permissionsModel";
import Analysis from "@/lib/db/newAnalysisModel";
import Shloka from "@/lib/db/newShlokaModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useUsers } from "@/lib/hooks/use-api";
import { Loader2 } from "lucide-react";

interface User {
	userID: string;
	name: string;
	perms: string;
}

interface Book {
	book: string;
}

interface GroupData {
	_id: string;
	name: string;
	type: "A" | "B";
	members: string[];
	assignedBooks: string[];
	supervisedGroups?: string[] | GroupData[];
}

export default function GroupsPage() {
	const router = useRouter();
	const { data, isLoading: usersLoading, error: usersError } = useUsers(1, 1000); // fetch all users for now
	const users = data?.users || [];
	const [groups, setGroups] = useState<GroupData[]>([]);
	const [books, setBooks] = useState<Book[]>([]);
	const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		type: "A" as "A" | "B",
		members: [] as string[],
		assignedBooks: [] as string[],
		supervisedGroups: [] as string[],
	});
	const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

	useEffect(() => {
		fetchGroups();
		fetchBooks();
	}, []);

	useEffect(() => {
		if (formData.type === "A") {
			setFilteredUsers(users.filter((user: User) => user.perms === "Annotator"));
		} else {
			setFilteredUsers(users.filter((user: User) => user.perms === "Editor"));
		}
	}, [formData.type, users]);

	const fetchGroups = async () => {
		try {
			const response = await fetch("/api/groups");
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
			const data = await response.json();
			if (Array.isArray(data)) {
				setGroups(data);
			} else {
				console.error("Invalid groups data format:", data);
				toast.error("Invalid groups data format received from server");
			}
		} catch (error) {
			console.error("Error fetching groups:", error);
			toast.error("Failed to fetch groups");
		}
	};

	const fetchBooks = async () => {
		try {
			const response = await fetch("/api/books");
			if (!response.ok) throw new Error("Failed to fetch books");
			const data = await response.json();
			setBooks(data);
		} catch (error) {
			console.error("Error fetching books:", error);
			toast.error("Failed to load books");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!isEditing) {
			const nameExists = groups.some((group) => group.name.toLowerCase() === formData.name.toLowerCase());
			if (nameExists) {
				toast.error("A group with this name already exists. Please choose a different name.");
				return;
			}
		}

		try {
			const response = await fetch(isEditing ? `/api/groups/${selectedGroup?._id}` : "/api/groups", {
				method: isEditing ? "PUT" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});

			const data = await response.json();

			if (response.ok) {
				toast.success(isEditing ? "Group updated successfully!" : "Group created successfully!");
				fetchGroups();
				if (!isEditing) {
					setFormData({
						name: "",
						type: "A",
						members: [],
						assignedBooks: [],
						supervisedGroups: [],
					});
				}
			} else {
				toast.error(data.error || (isEditing ? "Failed to update group" : "Failed to create group"));
			}
		} catch (error) {
			console.error("Error saving group:", error);
			toast.error(`An unexpected error occurred while ${isEditing ? "updating" : "creating"} the group`);
		}
	};

	const handleDelete = async (id: string) => {
		try {
			const response = await fetch(`/api/groups/${id}`, { method: "DELETE" });
			const data = await response.json();

			if (response.ok) {
				toast.success("Group deleted successfully!");
				fetchGroups();
			} else {
				toast.error(data.error || "Failed to delete group");
			}
		} catch (error) {
			console.error("Error deleting group:", error);
			toast.error("An unexpected error occurred while deleting the group");
		}
	};

	const handleEdit = (group: GroupData) => {
		setSelectedGroup(group);
		setIsEditing(true);
		setFormData({
			name: group.name,
			type: group.type,
			members: group.members,
			assignedBooks: group.assignedBooks,
			supervisedGroups: Array.isArray(group.supervisedGroups) ? group.supervisedGroups.map((g) => (typeof g === "string" ? g : g._id)) : [],
		});
	};

	const handleCancel = () => {
		setSelectedGroup(null);
		setIsEditing(false);
		setFormData({
			name: "",
			type: "A",
			members: [],
			assignedBooks: [],
			supervisedGroups: [],
		});
	};

	if (usersLoading) {
		return (
			<div className="flex justify-center py-8">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}
	if (usersError) {
		return <div className="text-red-500">Failed to load users</div>;
	}

	return (
		<div className="container mx-auto p-4 space-y-8">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">Group Management</h1>
				{!isEditing && (
					<Button onClick={() => setIsEditing(false)}>
						<Plus className="mr-2 h-4 w-4" /> Create New Group
					</Button>
				)}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{isEditing ? "Edit Group" : "Create New Group"}</CardTitle>
					<CardDescription>
						{isEditing ? "Update the group details below" : "Fill in the details to create a new group"}
						{formData.type === "A" ? " (Annotators only)" : " (Editors only)"}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<Label htmlFor="name">Group Name</Label>
								<Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={isEditing} />
							</div>

							<div className="space-y-2">
								<Label htmlFor="type">Group Type</Label>
								<Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as "A" | "B" })} disabled={isEditing}>
									<SelectTrigger>
										<SelectValue placeholder="Select type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="A">Group A</SelectItem>
										<SelectItem value="B">Group B</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Members ({formData.type === "A" ? "Annotators" : "Editors"})</Label>
								<ScrollArea className="h-[200px] rounded-md border p-4">
									<div className="space-y-2">
										{filteredUsers.map((user) => (
											<div key={user.userID} className="flex items-center space-x-2">
												<Checkbox
													id={`member-${user.userID}`}
													checked={formData.members.includes(user.userID)}
													onCheckedChange={(checked) => {
														const newMembers = checked ? [...formData.members, user.userID] : formData.members.filter((id) => id !== user.userID);
														setFormData({ ...formData, members: newMembers });
													}}
												/>
												<Label htmlFor={`member-${user.userID}`} className="text-sm font-normal cursor-pointer">
													{user.name} ({user.perms})
												</Label>
											</div>
										))}
									</div>
								</ScrollArea>
								{formData.members.length > 0 && <p className="text-sm text-muted-foreground">Selected members: {formData.members.length}</p>}
							</div>

							<div className="space-y-2">
								<Label>Assigned Books</Label>
								{formData.type === "B" ? (
									<div className="text-sm text-muted-foreground p-4 border rounded-md">
										Books will be automatically assigned based on the supervised annotator groups.
									</div>
								) : (
									<ScrollArea className="h-[200px] rounded-md border p-4">
										<div className="space-y-2">
											{books.map((book) => (
												<div key={book.book} className="flex items-center space-x-2">
													<Checkbox
														id={`book-${book.book}`}
														checked={formData.assignedBooks.includes(book.book)}
														onCheckedChange={(checked) => {
															const newBooks = checked ? [...formData.assignedBooks, book.book] : formData.assignedBooks.filter((b) => b !== book.book);
															setFormData({ ...formData, assignedBooks: newBooks });
														}}
													/>
													<Label htmlFor={`book-${book.book}`} className="text-sm font-normal cursor-pointer">
														{book.book}
													</Label>
												</div>
											))}
										</div>
									</ScrollArea>
								)}
							</div>

							{formData.type === "B" && (
								<div className="space-y-2">
									<Label>Supervised Groups (Annotator Groups)</Label>
									<ScrollArea className="h-[200px] rounded-md border p-4">
										<div className="space-y-2">
											{groups
												.filter((group) => group.type === "A")
												.map((group) => (
													<div key={group._id} className="flex items-center space-x-2">
														<Checkbox
															id={`supervised-${group._id}`}
															checked={formData.supervisedGroups.includes(group._id)}
															onCheckedChange={(checked) => {
																const newSupervisedGroups = checked
																	? [...formData.supervisedGroups, group._id]
																	: formData.supervisedGroups.filter((id) => id !== group._id);
																setFormData({ ...formData, supervisedGroups: newSupervisedGroups });
															}}
														/>
														<Label htmlFor={`supervised-${group._id}`} className="text-sm font-normal cursor-pointer">
															{group.name}
														</Label>
													</div>
												))}
										</div>
									</ScrollArea>
									{formData.supervisedGroups.length > 0 && (
										<p className="text-sm text-muted-foreground">Selected supervised groups: {formData.supervisedGroups.length}</p>
									)}
								</div>
							)}
						</div>

						<div className="flex gap-2">
							<Button type="submit">
								{isEditing ? (
									<>
										<Pencil className="mr-2 h-4 w-4" /> Update Group
									</>
								) : (
									<>
										<Plus className="mr-2 h-4 w-4" /> Create Group
									</>
								)}
							</Button>
							{isEditing && (
								<Button type="button" variant="outline" onClick={handleCancel}>
									<X className="mr-2 h-4 w-4" /> Cancel
								</Button>
							)}
						</div>
					</form>
				</CardContent>
			</Card>

			<div className="space-y-4">
				<h2 className="text-2xl font-bold">Existing Groups</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{groups.map((group) => (
						<Card key={group._id}>
							<CardHeader>
								<CardTitle>{group.name}</CardTitle>
								<CardDescription>Type: {group.type}</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<p className="text-sm">Members: {group.members.length}</p>
									<p className="text-sm">Books: {group.assignedBooks.length}</p>
									{group.type === "B" && group.supervisedGroups && (
										<p className="text-sm">Supervising: {Array.isArray(group.supervisedGroups) ? group.supervisedGroups.length : 0} annotator groups</p>
									)}
								</div>
							</CardContent>
							<CardFooter className="flex gap-2">
								<Button variant="outline" size="sm" onClick={() => handleEdit(group)}>
									<Pencil className="mr-2 h-4 w-4" /> Edit
								</Button>
								<Button variant="destructive" size="sm" onClick={() => handleDelete(group._id)}>
									<Trash2 className="mr-2 h-4 w-4" /> Delete
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}
