"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
	const [highlightedGroupId, setHighlightedGroupId] = useState<string | null>(null);
	const [formData, setFormData] = useState({
		name: "",
		type: "A" as "A" | "B",
		members: [] as string[],
		assignedBooks: [] as string[],
		supervisedGroups: [] as string[],
	});
	const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [groupToDelete, setGroupToDelete] = useState<GroupData | null>(null);
	const editFormRef = useRef<HTMLDivElement>(null);

	// When editing, show the current group + parent (if Group A) + children (if Group B)
	const groupsToShow = useMemo(() => {
		if (!isEditing || !selectedGroup) return groups;
		const ids = new Set<string>([selectedGroup._id]);

		if (selectedGroup.type === "A") {
			// Add parent Group B that supervises this Group A
			const parentGroup = groups.find(
				(g) =>
					g.type === "B" &&
					Array.isArray(g.supervisedGroups) &&
					g.supervisedGroups.some((sg) => (typeof sg === "string" ? sg : sg._id) === selectedGroup._id)
			);
			if (parentGroup) ids.add(parentGroup._id);
		} else {
			// Add child Group A(s) that this Group B supervises
			const supervisedIds = Array.isArray(selectedGroup.supervisedGroups)
				? selectedGroup.supervisedGroups.map((sg) => (typeof sg === "string" ? sg : sg._id))
				: [];
			supervisedIds.forEach((id) => ids.add(id));
		}

		return groups.filter((g) => ids.has(g._id));
	}, [isEditing, selectedGroup, groups]);

	useEffect(() => {
		fetchGroups();
		fetchBooks();
	}, []);

	// Check for highlighted group from user permissions page
	useEffect(() => {
		const highlightGroup = window.sessionStorage.getItem("highlightGroup");
		if (highlightGroup) {
			setHighlightedGroupId(highlightGroup);
			window.sessionStorage.removeItem("highlightGroup"); // Clear after use

			// Scroll to the highlighted group
			setTimeout(() => {
				const groupElement = document.getElementById(`group-${highlightGroup}`);
				if (groupElement) {
					groupElement.scrollIntoView({
						behavior: "smooth",
						block: "center",
					});
				}
			}, 200);

			// Remove highlighting after 5 seconds
			setTimeout(() => {
				setHighlightedGroupId(null);
			}, 5000);
		}
	}, []);

	// Function to get user name by ID
	const getUserName = (userId: string) => {
		const user = users.find((u: User) => u.userID === userId);
		return user ? user.name : "Unknown User";
	};

	// Function to remove a user from a group
	const handleRemoveUserFromGroup = async (groupId: string, userId: string) => {
		try {
			const group = groups.find((g) => g._id === groupId);
			if (!group) return;

			const updatedMembers = group.members.filter((id) => id !== userId);

			const response = await fetch(`/api/groups/${groupId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...group,
					members: updatedMembers,
				}),
			});

			if (response.ok) {
				toast.success("User removed from group successfully!");
				fetchGroups(); // Refresh groups
			} else {
				const data = await response.json();
				toast.error(data.error || "Failed to remove user from group");
			}
		} catch (error) {
			console.error("Error removing user from group:", error);
			toast.error("An unexpected error occurred while removing user from group");
		}
	};

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

		// Validation for required fields
		if (!formData.name.trim()) {
			toast.error("Group name is required");
			return;
		}

		if (formData.members.length === 0) {
			toast.error("At least one member must be selected");
			return;
		}

		// Group A specific validation
		if (formData.type === "A") {
			if (formData.assignedBooks.length === 0) {
				toast.error("Group A must have at least one assigned book");
				return;
			}
		}

		// Group B specific validation
		if (formData.type === "B") {
			if (formData.supervisedGroups.length === 0) {
				toast.error("Group B must supervise at least one annotator group");
				return;
			}
		}

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

	const handleDeleteClick = (group: GroupData) => {
		setGroupToDelete(group);
		setDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!groupToDelete) return;
		try {
			const response = await fetch(`/api/groups/${groupToDelete._id}`, { method: "DELETE" });
			const data = await response.json();

			if (response.ok) {
				toast.success("Group deleted successfully!");
				setDeleteDialogOpen(false);
				setGroupToDelete(null);
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
		// Scroll to edit form
		setTimeout(() => {
			editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
		}, 50);
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
		<div className="space-y-8">
			<Card ref={editFormRef}>
				<CardHeader>
					<div className="flex items-center justify-between gap-2">
						<CardTitle>{isEditing ? "Edit Group" : "Create New Group"}</CardTitle>
						{!isEditing && (
							<Button size="sm" onClick={() => setIsEditing(false)}>
								<Plus className="mr-2 h-4 w-4" /> New Group
							</Button>
						)}
					</div>
					<CardDescription>
						{isEditing ? "Update the group details below" : "Fill in the details to create a new group"}
						{formData.type === "A" ? " (Annotators only)" : " (Editors only)"}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<Label htmlFor="name">Group Name *</Label>
								<Input
									id="name"
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									required
									disabled={isEditing}
									placeholder="Enter group name"
								/>
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
								<Label>Members ({formData.type === "A" ? "Annotators" : "Editors"}) *</Label>
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
								<Label>Assigned Books {formData.type === "A" ? "*" : ""}</Label>
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
									<Label>Supervised Groups (Annotator Groups) *</Label>
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
							<Button
								type="submit"
								disabled={
									!formData.name.trim() ||
									formData.members.length === 0 ||
									(formData.type === "A" && formData.assignedBooks.length === 0) ||
									(formData.type === "B" && formData.supervisedGroups.length === 0)
								}
							>
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
				<h2 className="text-2xl font-bold">
					{isEditing ? "Editing" : "Existing"} Groups
					{isEditing && (
						<span className="ml-2 text-sm font-normal text-muted-foreground">
							(Showing current group and related parent/child groups)
						</span>
					)}
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{groupsToShow.map((group) => {
						const isParent =
							isEditing &&
							selectedGroup &&
							selectedGroup.type === "A" &&
							group.type === "B" &&
							group._id !== selectedGroup._id;
						const isChild =
							isEditing &&
							selectedGroup &&
							selectedGroup.type === "B" &&
							group.type === "A" &&
							group._id !== selectedGroup._id;
						return (
						<Card
							key={group._id}
							id={`group-${group._id}`}
							className={`transition-all duration-500 ${
								highlightedGroupId === group._id ? "ring-4 ring-blue-500 ring-opacity-75 shadow-lg scale-105 bg-blue-50 dark:bg-blue-950/20" : ""
							}`}
						>
							<CardHeader>
								<CardTitle className={highlightedGroupId === group._id ? "text-blue-700 dark:text-blue-300" : ""}>
									{group.name}
									{highlightedGroupId === group._id && (
										<span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">Highlighted</span>
									)}
									{isParent && (
										<span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">Parent</span>
									)}
									{isChild && (
										<span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">Child</span>
									)}
								</CardTitle>
								<CardDescription>Type: {group.type}</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									<div className="flex justify-between items-center">
										<p className="text-sm font-medium">Members ({group.members.length})</p>
										<p className="text-sm font-medium">Books ({group.assignedBooks.length})</p>
									</div>

									{group.type === "B" && group.supervisedGroups && (
										<p className="text-sm text-muted-foreground">
											Supervising: {Array.isArray(group.supervisedGroups) ? group.supervisedGroups.length : 0} annotator groups
										</p>
									)}

									{/* User List */}
									{group.members.length > 0 && (
										<div className="space-y-2">
											<p className="text-xs font-medium text-muted-foreground">Group Members:</p>
											<div className="max-h-24 overflow-y-auto space-y-1">
												{group.members.map((memberId) => (
													<div key={memberId} className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1 rounded">
														<span className="truncate">{getUserName(memberId)}</span>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleRemoveUserFromGroup(group._id, memberId)}
															className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
														>
															<X className="h-3 w-3" />
														</Button>
													</div>
												))}
											</div>
										</div>
									)}

									{/* Book List */}
									{group.assignedBooks.length > 0 && (
										<div className="space-y-2">
											<p className="text-xs font-medium text-muted-foreground">Assigned Books:</p>
											<div className="max-h-16 overflow-y-auto">
												{group.assignedBooks.map((book) => (
													<div key={book} className="text-xs bg-muted/30 px-2 py-1 rounded">
														{book}
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							</CardContent>
							<CardFooter className="flex gap-2">
								<Button variant="outline" size="sm" onClick={() => handleEdit(group)}>
									<Pencil className="mr-2 h-4 w-4" /> Edit
								</Button>
								<Button variant="destructive" size="sm" onClick={() => handleDeleteClick(group)}>
									<Trash2 className="mr-2 h-4 w-4" /> Delete
								</Button>
							</CardFooter>
						</Card>
					);
					})}
				</div>
			</div>

			<AlertDialog
				open={deleteDialogOpen}
				onOpenChange={(open) => {
					setDeleteDialogOpen(open);
					if (!open) setGroupToDelete(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete the group &quot;{groupToDelete?.name}&quot;. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<Button variant="destructive" onClick={handleDeleteConfirm}>
							Delete
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
