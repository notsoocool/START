"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UploadJsonPage from "@/components/global/upload-json"; // Import your JSON upload component
import UserPerms from "@/components/global/user-perms"; // Import your permission change component
import ReplaceBook from "@/components/global/replaceBook";
import DeleteEntry from "@/components/global/deleteEntry";
import { TreeNode } from "@/types/treeNode";

import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function AdminPage() {
	const [activeTab, setActiveTab] = useState("upload");
	const [treeData, setTreeData] = useState<TreeNode[]>([]);
	const router = useRouter();

	useEffect(() => {
		const checkAuthorization = async () => {
			try {
				const response = await fetch("/api/getCurrentUser");
				if (!response.ok) {
					throw new Error("User not authenticated");
				}

				const data = await response.json();

				console.log(data.perms);
				if (data.perms !== "Root" && data.perms !== "Admin") {
					toast.error("You are not authorized to view this page.");
					router.push("/"); // Redirect to main page
				}
			} catch (error) {
				toast.error("Authorization check failed:");
				router.push("/");
			}
		};

		checkAuthorization();
	}, [router]);

	useEffect(() => {
		const fetchTreeData = async () => {
			try {
				const response = await fetch("/api/books");
				if (!response.ok) throw new Error("Failed to fetch tree data");
				const data = await response.json();
				setTreeData(data);
			} catch (error) {
				console.error("Error fetching tree data:", error);
				toast.error("Failed to load book structure");
			}
		};

		if (activeTab === "delete") {
			fetchTreeData();
		}
	}, [activeTab]);

	return (
		<Tabs defaultValue="upload" className="space-y-4 mx-4 my-4">
			<TabsList>
				<TabsTrigger value="upload" onClick={() => setActiveTab("upload")}>
					Upload JSON
				</TabsTrigger>
				<TabsTrigger value="permissions" onClick={() => setActiveTab("permissions")}>
					Change User Permissions
				</TabsTrigger>
				<TabsTrigger value="replace" onClick={() => setActiveTab("replace")}>
					Replace Book Name
				</TabsTrigger>
				<TabsTrigger value="delete" onClick={() => setActiveTab("delete")}>
					Delete Entries
				</TabsTrigger>
			</TabsList>

			<TabsContent value="upload">
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-lg font-semibold">Upload JSON</CardTitle>
					</CardHeader>
					<CardContent>
						<UploadJsonPage />
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="permissions">
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-lg font-semibold">Change User Permissions</CardTitle>
					</CardHeader>
					<CardContent>
						<UserPerms />
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="replace">
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-lg font-semibold">Replace Book Name</CardTitle>
					</CardHeader>
					<CardContent>
						<ReplaceBook />
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="delete">
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-lg font-semibold">Delete Entries</CardTitle>
					</CardHeader>
					<CardContent>
						<DeleteEntry treeData={treeData} />
					</CardContent>
				</Card>
			</TabsContent>
		</Tabs>
	);
}
