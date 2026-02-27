"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UploadJsonPage from "@/components/global/upload-json"; // Import your JSON upload component
import UserPerms from "@/components/global/user-perms"; // Import your permission change component
import ReplaceBook from "@/components/global/replaceBook";
import GroupsPage from "@/components/global/groupAdmin";
import BookPublishPage from "@/components/global/manageStatus";
import DeleteEntry from "@/components/global/deleteEntry";
import HistoryPage from "@/components/global/history";
import DataDownload from "@/components/global/dataDownload";
import SanityCheck from "@/components/global/sanityCheck";
import LanguageManagement from "@/components/global/languageManagement";
import OnlineUsers from "@/components/global/onlineUsers";
import { TreeNode } from "@/types/treeNode";

import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminPage() {
	const searchParams = useSearchParams();
	const tabParam = searchParams.get("tab");
	const [activeTab, setActiveTab] = useState("permissions");
	const [treeData, setTreeData] = useState<TreeNode[]>([]);
	const router = useRouter();
	const tabsScrollRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(true);

	// Function to change tabs from child components
	const changeTab = (tabName: string) => {
		console.log("changeTab called with:", tabName);
		console.log("Current activeTab:", activeTab);
		setActiveTab(tabName);
		console.log("activeTab set to:", tabName);
	};

	// Open tab from URL (?tab=sanity etc.)
	useEffect(() => {
		if (tabParam && ["permissions", "replace", "delete", "group", "publish", "languages", "history", "download", "sanity", "online"].includes(tabParam)) {
			setActiveTab(tabParam);
		}
	}, [tabParam]);

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

	// Debug activeTab changes
	useEffect(() => {
		console.log("activeTab changed to:", activeTab);
	}, [activeTab]);

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

	// Check scroll position to show/hide fade indicators
	const checkScrollPosition = () => {
		const scrollContainer = tabsScrollRef.current;
		if (!scrollContainer) return;

		const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
		setCanScrollLeft(scrollLeft > 0);
		setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
	};

	useEffect(() => {
		const scrollContainer = tabsScrollRef.current;
		if (!scrollContainer) return;

		// Check on mount and resize
		checkScrollPosition();
		window.addEventListener("resize", checkScrollPosition);
		scrollContainer.addEventListener("scroll", checkScrollPosition);

		return () => {
			window.removeEventListener("resize", checkScrollPosition);
			scrollContainer.removeEventListener("scroll", checkScrollPosition);
		};
	}, []);

	return (
		<Tabs
			value={activeTab}
			onValueChange={setActiveTab}
			className="mx-auto my-6 max-w-6xl space-y-4"
		>
			<div className="space-y-3">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							Admin Console
						</h1>
						<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
							Manage data imports, permissions, book metadata,
							languages, groups, publishing, and more from a
							single place.
						</p>
					</div>

					{/* Mobile-friendly section selector (shadcn Select) */}
					<div className="sm:hidden">
						<label htmlFor="admin-section" className="sr-only">
							Select admin section
						</label>
						<Select value={activeTab} onValueChange={setActiveTab}>
							<SelectTrigger
								id="admin-section"
								className="w-full"
							>
								<SelectValue placeholder="Select admin section" />
							</SelectTrigger>
							<SelectContent>
								{/* <SelectItem value="upload">
									Upload JSON
								</SelectItem> */}
								<SelectItem value="permissions">
									Change User Permissions
								</SelectItem>
								<SelectItem value="replace">
									Replace Book Name
								</SelectItem>
								<SelectItem value="delete">
									Delete Entries
								</SelectItem>
								<SelectItem value="group">
									Group Administration
								</SelectItem>
								<SelectItem value="publish">
									Book Publishing
								</SelectItem>
								<SelectItem value="languages">
									Language Management
								</SelectItem>
								<SelectItem value="history">History</SelectItem>
								<SelectItem value="download">
									Data Download
								</SelectItem>
								<SelectItem value="sanity">Sanity Check</SelectItem>
								<SelectItem value="online">
									Online Users
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Scrollable tabs bar with visual scroll indicators */}
				<div className="relative -mx-4 border-b bg-background/80 px-4 pb-2 pt-1 backdrop-blur-sm sm:mx-0 sm:rounded-xl sm:border sm:bg-muted/60 sm:px-3">
					{/* Left fade gradient - shows when can scroll left */}
					{canScrollLeft && (
						<div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-background/80 via-background/40 to-transparent sm:from-muted/60 sm:via-muted/30" />
					)}
					{/* Right fade gradient - shows when can scroll right */}
					{canScrollRight && (
						<div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-background/80 via-background/40 to-transparent sm:from-muted/60 sm:via-muted/30" />
					)}
					<div
						ref={tabsScrollRef}
						className="overflow-x-auto scrollbar-hide"
					>
						<TabsList className="min-w-max space-x-1">
							{/* <TabsTrigger
								value="upload"
								className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm"
							>
								Upload JSON
							</TabsTrigger> */}
							<TabsTrigger
								value="permissions"
								className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm"
							>
								Change User Permissions
							</TabsTrigger>
							<TabsTrigger
								value="replace"
								className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm"
							>
								Replace Book Name
							</TabsTrigger>
							<TabsTrigger
								value="delete"
								className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm"
							>
								Delete Entries
							</TabsTrigger>
							<TabsTrigger
								value="group"
								className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm"
							>
								Group Administration
							</TabsTrigger>
							<TabsTrigger
								value="publish"
								className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm"
							>
								Book Publishing
							</TabsTrigger>
							<TabsTrigger
								value="languages"
								className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm"
							>
								Language Management
							</TabsTrigger>
							<TabsTrigger
								value="history"
								className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm"
							>
								History
							</TabsTrigger>
							<TabsTrigger
								value="download"
								className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm"
							>
								Data Download
							</TabsTrigger>
							<TabsTrigger
								value="sanity"
								className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm"
							>
								Sanity Check
							</TabsTrigger>
							<TabsTrigger
								value="online"
								className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm"
							>
								Online Users
							</TabsTrigger>
						</TabsList>
					</div>
				</div>
			</div>

			<TabsContent value="upload">
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-lg font-semibold">
							Upload JSON
						</CardTitle>
					</CardHeader>
					<CardContent>
						<UploadJsonPage />
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="permissions">
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-lg font-semibold">
							Change User Permissions
						</CardTitle>
					</CardHeader>
					<CardContent>
						<UserPerms changeTab={changeTab} />
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="replace">
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-lg font-semibold">
							Replace Book Name
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ReplaceBook />
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="delete">
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-lg font-semibold">
							Delete Entries
						</CardTitle>
					</CardHeader>
					<CardContent>
						<DeleteEntry treeData={treeData} />
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="group">
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-lg font-semibold">
							Group Administration
						</CardTitle>
					</CardHeader>
					<CardContent>
						<GroupsPage />
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="publish">
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-lg font-semibold">
							Book Publishing
						</CardTitle>
					</CardHeader>
					<CardContent>
						<BookPublishPage />
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="languages">
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-lg font-semibold">
							Language Management
						</CardTitle>
					</CardHeader>
					<CardContent>
						<LanguageManagement />
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="history">
				<HistoryPage />
			</TabsContent>
			<TabsContent value="download">
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-lg font-semibold">
							Data Download
						</CardTitle>
					</CardHeader>
					<CardContent>
						<DataDownload />
					</CardContent>
				</Card>
			</TabsContent>
			<TabsContent value="sanity">
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-lg font-semibold">
							Sanity Check
						</CardTitle>
					</CardHeader>
					<CardContent>
						<SanityCheck />
					</CardContent>
				</Card>
			</TabsContent>
			<TabsContent value="online">
				<Card className="mt-4">
					<CardHeader>
						<CardTitle className="text-lg font-semibold">
							Online Users
						</CardTitle>
					</CardHeader>
					<CardContent>
						<OnlineUsers />
					</CardContent>
				</Card>
			</TabsContent>
		</Tabs>
	);
}
