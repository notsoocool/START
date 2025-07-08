"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { Checkbox } from "@/components/ui/checkbox";
import { usePageReady } from "@/components/ui/PageReadyContext";

interface Shloka {
	_id: string;
	book: string;
	part1: string;
	part2: string;
	chaptno: string;
	userPublished: boolean;
	groupPublished: boolean;
	groupId?: string;
}

interface Group {
	_id: string;
	name: string;
	type: "A" | "B";
}

export default function PublishPage() {
	const { isSignedIn } = useAuth();
	const [shlokas, setShlokas] = useState<Shloka[]>([]);
	const [groups, setGroups] = useState<Group[]>([]);
	const [selectedGroup, setSelectedGroup] = useState<string>("");
	const [searchTerm, setSearchTerm] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const { setPageReady } = usePageReady();

	useEffect(() => {
		fetchGroups();
	}, []);

	useEffect(() => {
		if (selectedGroup) {
			fetchShlokas();
		}
	}, [selectedGroup, searchTerm]);

	useEffect(() => {
		if (!isLoading) setPageReady(true);
	}, [isLoading, setPageReady]);

	const fetchGroups = async () => {
		try {
			const response = await fetch("/api/groups");
			if (!response.ok) throw new Error("Failed to fetch groups");
			const data = await response.json();
			setGroups(data);
		} catch (error) {
			console.error("Error fetching groups:", error);
			toast.error("Failed to load groups");
		} finally {
			setIsLoading(false);
		}
	};

	const fetchShlokas = async () => {
		try {
			const response = await fetch(`/api/shlokas?groupId=${selectedGroup}&search=${searchTerm}`);
			if (!response.ok) throw new Error("Failed to fetch shlokas");
			const data = await response.json();
			setShlokas(data);
		} catch (error) {
			console.error("Error fetching shlokas:", error);
			toast.error("Failed to load shlokas");
		}
	};

	const handlePublishChange = async (shlokaId: string, field: "userPublished" | "groupPublished", value: boolean) => {
		try {
			const response = await fetch("/api/shlokas/publish", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					shlokaId,
					field,
					value,
					groupId: selectedGroup,
				}),
			});

			if (!response.ok) throw new Error("Failed to update publishing status");

			const data = await response.json();
			setShlokas(data);
			toast.success(`Publishing status updated successfully`);
		} catch (error) {
			console.error("Error updating publishing status:", error);
			toast.error("Failed to update publishing status");
		}
	};

	if (!isSignedIn) {
		return (
			<div className="min-h-[75vh] bg-gradient-to-br from-slate-50 to-slate-100 p-8">
				<div className="max-w-4xl mx-auto space-y-6">
					<h2 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mb-8">
						Manage Shloka Publishing
					</h2>
					<div className="w-full max-w-2xl mx-auto backdrop-blur-sm bg-white/30 p-6 rounded-xl shadow-xl">
						<p className="text-center text-gray-600">Please sign in to manage shloka publishing.</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-4 space-y-8">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">Manage Shloka Publishing</h1>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Publishing Status</CardTitle>
					<CardDescription>Select a group and manage publishing status of shlokas</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Select Group</Label>
								<Select value={selectedGroup} onValueChange={setSelectedGroup}>
									<SelectTrigger>
										<SelectValue placeholder="Select a group" />
									</SelectTrigger>
									<SelectContent>
										{groups.map((group) => (
											<SelectItem key={group._id} value={group._id}>
												{group.name} ({group.type})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Search Shlokas</Label>
								<Input placeholder="Search by book, part, or chapter" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
							</div>
						</div>

						{selectedGroup && (
							<div className="space-y-2">
								<Label>Shlokas</Label>
								<ScrollArea className="h-[600px] rounded-md border p-4">
									<div className="space-y-4">
										{shlokas.map((shloka) => (
											<div key={shloka._id} className="flex items-center justify-between p-2 border rounded-md">
												<div className="space-y-1">
													<p className="font-medium">
														{shloka.book} - {shloka.part1} {shloka.part2} Chapter {shloka.chaptno}
													</p>
												</div>
												<div className="flex items-center space-x-4">
													<div className="flex items-center space-x-2">
														<Checkbox
															id={`user-${shloka._id}`}
															checked={shloka.userPublished}
															onCheckedChange={(checked) => handlePublishChange(shloka._id, "userPublished", checked as boolean)}
														/>
														<Label htmlFor={`user-${shloka._id}`} className="text-sm">
															User Published
														</Label>
													</div>
													<div className="flex items-center space-x-2">
														<Checkbox
															id={`group-${shloka._id}`}
															checked={shloka.groupPublished}
															onCheckedChange={(checked) => handlePublishChange(shloka._id, "groupPublished", checked as boolean)}
														/>
														<Label htmlFor={`group-${shloka._id}`} className="text-sm">
															Group Published
														</Label>
													</div>
												</div>
											</div>
										))}
									</div>
								</ScrollArea>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
