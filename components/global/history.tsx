"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Loader2, ChevronLeft, ChevronRight, Info, RefreshCw, FileText, Settings } from "lucide-react";
import { useHistory } from "@/lib/hooks/use-api";

type HistoryTypeFilter = "all" | "analysis" | "usage";

interface AnalysisHistoryEntry {
	_id: string;
	type: "analysis";
	action: "edit" | "add" | "delete";
	userId: string;
	userName: string;
	timestamp: string;
	location: { book: string; part1?: string; part2?: string; chaptno: string; slokano: string };
	row: Record<string, unknown>;
	oldRow?: Record<string, unknown>;
	changedFields?: string[];
}

interface UsageHistoryEntry {
	_id: string;
	type: "usage";
	action: string;
	userId: string;
	userName: string;
	timestamp: string;
	details: Record<string, unknown>;
}

type HistoryEntry = AnalysisHistoryEntry | UsageHistoryEntry;

interface GroupedEntry {
	entries: HistoryEntry[];
	userName: string;
	location: string;
	startTime: string;
	endTime: string;
	actionSummary: Record<string, number>;
	entryType: "analysis" | "usage";
}

const GROUP_WINDOW_MS = 10 * 60 * 1000;

function toDisplayString(val: unknown): string {
	if (val === null || val === undefined) return "";
	if (typeof val === "string") return val;
	if (typeof val === "object") return JSON.stringify(val, null, 2);
	return String(val);
}

const DIFF_COLUMNS = [
	{ key: "anvaya_no", label: "Anvaya" },
	{ key: "word", label: "Word" },
	{ key: "poem", label: "Poem" },
	{ key: "sandhied_word", label: "Sandhied" },
	{ key: "morph_analysis", label: "Morph Analysis" },
	{ key: "morph_in_context", label: "Morph" },
	{ key: "kaaraka_sambandha", label: "Kaaraka" },
	{ key: "possible_relations", label: "Possible Relations" },
	{ key: "bgcolor", label: "Bgcolor" },
	{ key: "name_classification", label: "Name" },
	{ key: "sarvanAma", label: "SarvanAma" },
	{ key: "prayoga", label: "Prayoga" },
	{ key: "samAsa", label: "SamAsa" },
	{ key: "english_meaning", label: "English" },
	{ key: "hindi_meaning", label: "Hindi" },
] as const;

function getEntryLocation(entry: HistoryEntry): string {
	if (entry.type === "analysis") {
		const loc = entry.location;
		return [loc.book, loc.part1, loc.part2, loc.chaptno, loc.slokano].filter(Boolean).join(".");
	}
	const d = entry.details as Record<string, unknown>;
	const loc = d?.location as Record<string, string> | undefined;
	if (loc) {
		return [loc.book, loc.part1, loc.part2, loc.chaptno, loc.slokano].filter(Boolean).join(".");
	}
	return toDisplayString(d?.book || d?.groupId || d?.shlokaId || entry.action);
}

function DiffCell({ oldVal, newVal }: { oldVal: string; newVal: string }) {
	const changed = oldVal !== newVal;
	if (!changed) return <span className="text-xs">{oldVal || "-"}</span>;
	return (
		<div className="text-xs space-y-0.5">
			{oldVal ? (
				<div
					className="bg-red-500/20 text-red-800 dark:text-red-200 rounded px-1 break-words"
					title={oldVal}
				>
					− {oldVal}
				</div>
			) : null}
			{newVal ? (
				<div
					className="bg-green-500/20 text-green-800 dark:text-green-200 rounded px-1 break-words"
					title={newVal}
				>
					+ {newVal}
				</div>
			) : null}
		</div>
	);
}

function formatUsageAction(action: string): string {
	return action
		.split("_")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

export default function HistoryPage() {
	const [selectedGroup, setSelectedGroup] = useState<GroupedEntry | null>(null);
	const [showDetailsDialog, setShowDetailsDialog] = useState(false);
	const [page, setPage] = useState(1);
	const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>("all");
	const { data, isLoading, error, refetch } = useHistory(page, 50, typeFilter);
	const history: HistoryEntry[] = data?.history || [];
	const pagination = data?.pagination || { total: 0, page: 1, limit: 50, pages: 0 };

	const groupedHistory = useMemo(() => {
		const groups: GroupedEntry[] = [];
		let currentGroup: HistoryEntry[] = [];
		let groupStart: HistoryEntry | null = null;

		for (const entry of history) {
			const loc = getEntryLocation(entry);
			const entryTime = new Date(entry.timestamp).getTime();
			const groupLoc = groupStart ? getEntryLocation(groupStart) : "";

			const canMerge =
				groupStart &&
				entry.userId === groupStart.userId &&
				entry.type === groupStart.type &&
				loc === groupLoc &&
				entryTime - new Date(groupStart.timestamp).getTime() <= GROUP_WINDOW_MS;

			if (canMerge && currentGroup.length > 0) {
				currentGroup.push(entry);
			} else {
				if (currentGroup.length > 0) {
					const summary: Record<string, number> = {};
					currentGroup.forEach((e) => {
						summary[e.action] = (summary[e.action] || 0) + 1;
					});
					groups.push({
						entries: [...currentGroup],
						userName: currentGroup[0].userName,
						location: getEntryLocation(currentGroup[0]),
						startTime: currentGroup[0].timestamp,
						endTime: currentGroup[currentGroup.length - 1].timestamp,
						actionSummary: summary,
						entryType: currentGroup[0].type,
					});
				}
				currentGroup = [entry];
				groupStart = entry;
			}
		}
		if (currentGroup.length > 0) {
			const summary: Record<string, number> = {};
			currentGroup.forEach((e) => {
				summary[e.action] = (summary[e.action] || 0) + 1;
			});
			groups.push({
				entries: currentGroup,
				userName: currentGroup[0].userName,
				location: getEntryLocation(currentGroup[0]),
				startTime: currentGroup[0].timestamp,
				endTime: currentGroup[currentGroup.length - 1].timestamp,
				actionSummary: summary,
				entryType: currentGroup[0].type,
			});
		}
		return groups;
	}, [history]);

	const getActionColor = (action: string) => {
		switch (action) {
			case "delete":
			case "shloka_delete":
			case "shloka_bulk_delete":
			case "group_delete":
			case "lock":
				return "destructive";
			case "edit":
			case "unpublish":
			case "group_update":
				return "secondary";
			case "add":
			case "create":
			case "shloka_create":
			case "group_create":
			case "member_add":
			case "unlock":
				return "outline";
			default:
				return "default";
		}
	};

	const [currentData, setCurrentData] = useState<unknown[] | null>(null);
	const [fetchingData, setFetchingData] = useState(false);

	const handleGroupClick = (group: GroupedEntry) => {
		setSelectedGroup(group);
		setShowDetailsDialog(true);
		setCurrentData(null);
	};

	useEffect(() => {
		if (!showDetailsDialog || !selectedGroup || selectedGroup.entryType !== "analysis") return;
		const first = selectedGroup.entries[0];
		if (first.type !== "analysis") return;
		const loc = first.location;
		const part1 = loc.part1 ?? "null";
		const part2 = loc.part2 ?? "null";
		const url = `/api/analysis/${encodeURIComponent(loc.book)}/${encodeURIComponent(part1)}/${encodeURIComponent(part2)}/${encodeURIComponent(loc.chaptno)}/${encodeURIComponent(loc.slokano)}`;
		setFetchingData(true);
		fetch(url)
			.then((r) => r.json())
			.then((data) => setCurrentData(Array.isArray(data) ? data : []))
			.catch(() => setCurrentData(null))
			.finally(() => setFetchingData(false));
	}, [showDetailsDialog, selectedGroup]);

	const renderAnalysisDetails = (group: GroupedEntry) => {
		const analysisEntries = group.entries.filter((e): e is AnalysisHistoryEntry => e.type === "analysis");
		if (analysisEntries.length === 0) return null;

		const rows: { row: Record<string, unknown>; oldRow?: Record<string, unknown>; changedFields?: string[]; action: string }[] = [];
		for (const e of analysisEntries) {
			rows.push({
				row: e.row,
				oldRow: e.oldRow,
				changedFields: e.changedFields || [],
				action: e.action,
			});
		}

		return (
			<div className="space-y-4">
				<div className="text-sm text-muted-foreground mb-2">
					Changed rows ({rows.length})
				</div>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								{DIFF_COLUMNS.map((col) => (
									<TableHead key={col.key}>{col.label}</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((r, idx) => (
								<TableRow key={idx}>
									{DIFF_COLUMNS.map((col) => {
										const oldVal = toDisplayString(r.oldRow?.[col.key]);
										const newVal = toDisplayString(r.row[col.key]);
										const isChanged = r.changedFields?.includes(col.key);
										if (r.action === "edit" && isChanged) {
											return (
												<TableCell key={col.key} className="max-w-[120px] align-top">
													<DiffCell oldVal={oldVal} newVal={newVal} />
												</TableCell>
											);
										}
										if (r.action === "add") {
											return (
												<TableCell key={col.key} className="max-w-[120px] align-top">
													<span className="text-xs text-green-700 dark:text-green-300">{newVal || "-"}</span>
												</TableCell>
											);
										}
										if (r.action === "delete") {
											return (
												<TableCell key={col.key} className="max-w-[120px] align-top">
													<span className="text-xs text-red-700 dark:text-red-300">{oldVal || newVal || "-"}</span>
												</TableCell>
											);
										}
										return (
											<TableCell key={col.key} className="max-w-[120px] align-top">
												<span className="text-xs">{newVal || "-"}</span>
											</TableCell>
										);
									})}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		);
	};

	// Map old*/new* key pairs to human-readable labels
	const USAGE_DIFF_LABELS: Record<string, string> = {
		oldPermission: "Permission",
		oldSlokano: "Slokano",
		oldSpart: "Spart",
		oldName: "Name",
		oldMembers: "Members",
		oldValue: "Value",
	};

	const renderUsageDetails = (group: GroupedEntry) => {
		const usageEntries = group.entries.filter((e): e is UsageHistoryEntry => e.type === "usage");
		if (usageEntries.length === 0) return null;

		return (
			<div className="space-y-4">
				{usageEntries.map((e, idx) => {
					const details = e.details as Record<string, unknown>;
					const diffPairs: { label: string; oldVal: string; newVal: string }[] = [];
					const contextFields: { label: string; value: string }[] = [];

					for (const key of Object.keys(details)) {
						if (key.startsWith("old")) {
							const newKey = "new" + key.slice(3);
							const newVal = details[newKey];
							if (newVal !== undefined) {
								const label = USAGE_DIFF_LABELS[key] || key.replace(/^old/, "").replace(/([A-Z])/g, " $1").trim();
								diffPairs.push({
									label,
									oldVal: toDisplayString(details[key]),
									newVal: toDisplayString(newVal),
								});
							}
						} else if (!key.startsWith("new") && key !== "changes") {
							// Skip if we already have it in a diff pair
							const oldKey = "old" + key.charAt(0).toUpperCase() + key.slice(1);
							if (!(oldKey in details)) {
								contextFields.push({
									label: key.replace(/([A-Z])/g, " $1").trim(),
									value: toDisplayString(details[key]),
								});
							}
						}
					}

					return (
						<div key={idx} className="rounded-md border p-3 space-y-3">
							<div className="font-medium">{formatUsageAction(e.action)}</div>
							{contextFields.length > 0 && (
								<div className="text-xs text-muted-foreground space-y-1">
									{contextFields.map((f) => (
										<div key={f.label}>
											<span className="font-medium">{f.label}:</span> {f.value}
										</div>
									))}
								</div>
							)}
							{diffPairs.length > 0 ? (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[140px]">Field</TableHead>
											<TableHead>Change</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{diffPairs.map((p) => (
											<TableRow key={p.label}>
												<TableCell className="font-medium text-xs">{p.label}</TableCell>
												<TableCell className="max-w-[300px]">
													<DiffCell oldVal={p.oldVal} newVal={p.newVal} />
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							) : (
								<pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
									{JSON.stringify(details, null, 2)}
								</pre>
							)}
						</div>
					);
				})}
			</div>
		);
	};

	const renderDetailsDialog = () => {
		if (!selectedGroup) return null;

		const isAnalysis = selectedGroup.entryType === "analysis";

		return (
			<Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
				<DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
					<DialogHeader>
						<DialogTitle>
							{selectedGroup.entries.length > 1 ? "Edit session" : "Change details"} — {selectedGroup.location}
						</DialogTitle>
					</DialogHeader>
					<div className="text-sm text-muted-foreground mb-2">
						{selectedGroup.userName} • {format(new Date(selectedGroup.startTime), "MMM d, yyyy HH:mm")}
						{selectedGroup.entries.length > 1 &&
							` – ${format(new Date(selectedGroup.endTime), "HH:mm")} (${selectedGroup.entries.length} changes)`}
					</div>

					<Tabs defaultValue="changes" className="flex-1 flex flex-col min-h-0">
						<TabsList>
							<TabsTrigger value="changes">Changes (diff)</TabsTrigger>
							{isAnalysis && (
								<TabsTrigger value="current">
									Current state
									{fetchingData && <Loader2 className="ml-1.5 h-3 w-3 animate-spin" />}
								</TabsTrigger>
							)}
						</TabsList>
						<TabsContent value="changes" className="flex-1 mt-3 min-h-0">
							<ScrollArea className="h-[50vh] pr-4">
								{isAnalysis ? renderAnalysisDetails(selectedGroup) : renderUsageDetails(selectedGroup)}
							</ScrollArea>
						</TabsContent>
						{isAnalysis && (
							<TabsContent value="current" className="flex-1 mt-3 min-h-0">
								<ScrollArea className="h-[50vh] pr-4">
									{fetchingData ? (
										<div className="flex justify-center py-12">
											<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
										</div>
									) : currentData && Array.isArray(currentData) && currentData.length > 0 ? (
										<div className="space-y-4">
											<div className="text-sm text-muted-foreground mb-2">
												Current analysis data at this location ({currentData.length} rows)
											</div>
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Anvaya</TableHead>
														<TableHead>Word</TableHead>
														<TableHead>Morph</TableHead>
														<TableHead>Kaaraka</TableHead>
														<TableHead>English</TableHead>
														<TableHead>Hindi</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{(currentData as Record<string, unknown>[]).map((row, i) => (
														<TableRow key={(row._id as string) || i}>
															<TableCell className="font-mono text-xs">{toDisplayString(row.anvaya_no)}</TableCell>
															<TableCell>{toDisplayString(row.word)}</TableCell>
															<TableCell className="max-w-[120px] truncate text-xs" title={toDisplayString(row.morph_in_context)}>
																{toDisplayString(row.morph_in_context)}
															</TableCell>
															<TableCell className="max-w-[100px] truncate text-xs" title={toDisplayString(row.kaaraka_sambandha)}>
																{toDisplayString(row.kaaraka_sambandha)}
															</TableCell>
															<TableCell className="max-w-[100px] truncate text-xs">{toDisplayString(row.english_meaning)}</TableCell>
															<TableCell className="max-w-[100px] truncate text-xs">{toDisplayString(row.hindi_meaning)}</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									) : currentData ? (
										<div className="text-sm text-muted-foreground py-8">
											No analysis data at this location (may have been deleted)
										</div>
									) : null}
								</ScrollArea>
							</TabsContent>
						)}
					</Tabs>
				</DialogContent>
			</Dialog>
		);
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="text-lg font-semibold">History of Changes</CardTitle>
				<div className="flex items-center gap-2">
					<Tabs value={typeFilter} onValueChange={(v) => { setTypeFilter(v as HistoryTypeFilter); setPage(1); }}>
						<TabsList>
							<TabsTrigger value="all">All</TabsTrigger>
							<TabsTrigger value="analysis">
								<FileText className="h-3.5 w-3.5 mr-1" />
								Analysis
							</TabsTrigger>
							<TabsTrigger value="usage">
								<Settings className="h-3.5 w-3.5 mr-1" />
								Usage
							</TabsTrigger>
						</TabsList>
					</Tabs>
					<Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
						<RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="flex justify-center py-8">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				) : error ? (
					<div className="text-red-500">Failed to load history</div>
				) : (
					<>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Time</TableHead>
									<TableHead>User</TableHead>
									<TableHead>Action</TableHead>
									<TableHead>Location</TableHead>
									<TableHead></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{groupedHistory.map((group, idx) => (
									<TableRow
										key={group.entries[0]._id + idx}
										className="cursor-pointer hover:bg-muted/50"
										onClick={() => handleGroupClick(group)}
									>
										<TableCell>
											{format(new Date(group.startTime), "MMM d, HH:mm")}
											{group.entries.length > 1 && (
												<span className="text-muted-foreground text-xs ml-1">
													–{format(new Date(group.endTime), "HH:mm")}
												</span>
											)}
										</TableCell>
										<TableCell>{group.userName}</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{Object.entries(group.actionSummary).map(([action, count]) => (
													<Badge key={action} variant={getActionColor(action)}>
														{formatUsageAction(action)}
														{count > 1 && ` ×${count}`}
													</Badge>
												))}
											</div>
										</TableCell>
										<TableCell className="font-mono text-sm">{group.location}</TableCell>
										<TableCell>
											<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
												<Info className="h-4 w-4" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>

						<div className="flex items-center justify-between mt-4">
							<Button
								variant="outline"
								onClick={() => setPage(pagination.page - 1)}
								disabled={pagination.page === 1}
							>
								<ChevronLeft className="h-4 w-4 mr-2" />
								Previous
							</Button>
							<span className="text-sm text-muted-foreground">
								Page {pagination.page} of {pagination.pages}
							</span>
							<Button
								variant="outline"
								onClick={() => setPage(pagination.page + 1)}
								disabled={pagination.page === pagination.pages}
							>
								Next
								<ChevronRight className="h-4 w-4 ml-2" />
							</Button>
						</div>

						{renderDetailsDialog()}
					</>
				)}
			</CardContent>
		</Card>
	);
}
