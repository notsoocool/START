import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, ChevronLeft, ChevronRight, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface HistoryEntry {
	_id: string;
	action: "delete" | "edit" | "create" | "publish" | "unpublish" | "lock" | "unlock" | "complete_delete";
	modelType: "Shloka" | "Analysis";
	userId: string;
	userName: string;
	timestamp: string;
	details: {
		book: string;
		part1?: string;
		part2?: string;
		chaptno: string;
		slokano: string;
		isCompleteDeletion?: boolean;
		changes?: {
			field: string;
			oldValue: any;
			newValue: any;
		}[];
	};
}

interface DeletedAnalysis {
	anvaya_no: string;
	word: string;
	sentno: string;
	morph_analysis: string;
	english_meaning: string;
	hindi_meaning: string;
}

interface Pagination {
	total: number;
	page: number;
	limit: number;
	pages: number;
}

export default function HistoryPage() {
	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, pages: 0 });
	const [loading, setLoading] = useState(true);
	const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
	const [showDetailsDialog, setShowDetailsDialog] = useState(false);

	const fetchHistory = async (page: number) => {
		try {
			setLoading(true);
			const response = await fetch(`/api/history?page=${page}&limit=20`);
			if (!response.ok) throw new Error("Failed to fetch history");
			const data = await response.json();
			setHistory(data.history);
			setPagination(data.pagination);
		} catch (error) {
			console.error("Error fetching history:", error);
			toast.error("Failed to load history");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchHistory(1);
	}, []);

	const getActionColor = (action: string) => {
		switch (action) {
			// Destructive actions (red)
			case "delete":
			case "complete_delete":
			case "lock":
				return "destructive";

			// Secondary actions (gray)
			case "edit":
			case "unpublish":
				return "secondary";

			// Outline actions (neutral)
			case "create":
			case "unlock":
				return "outline";

			// Default actions (primary)
			case "publish":
			default:
				return "default";
		}
	};

	const formatChanges = (changes?: { field: string; oldValue: any; newValue: any }[]) => {
		if (!changes || changes.length === 0) return null;
		return changes.map((change) => (
			<div key={change.field} className="text-sm">
				<span className="font-medium">{change.field}:</span> <span className="text-red-600">{JSON.stringify(change.oldValue)}</span> →{" "}
				<span className="text-green-600">{JSON.stringify(change.newValue)}</span>
			</div>
		));
	};

	const formatLocation = (entry: HistoryEntry) => {
		const parts = [entry.details.book, entry.details.part1, entry.details.part2, entry.details.chaptno, entry.details.slokano].filter(Boolean);
		return parts.join(".");
	};

	const handleEntryClick = (entry: HistoryEntry) => {
		setSelectedEntry(entry);
		setShowDetailsDialog(true);
	};

	const renderDetailsDialog = () => {
		if (!selectedEntry) return null;

		const changes = selectedEntry.details.changes?.[0];
		const isCompleteDelete = selectedEntry.action === "complete_delete";

		return (
			<Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
				<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{selectedEntry.action === "complete_delete" ? "Complete Deletion Details" : "Change Details"}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="text-sm text-muted-foreground">Location: {formatLocation(selectedEntry)}</div>

						{isCompleteDelete && changes?.oldValue?.deletedAnalyses ? (
							<>
								<div className="font-medium mb-2">Deleted Shloka:</div>
								<div className="text-sm mb-4">
									<div>Slokano: {changes.oldValue.slokano}</div>
									<div>Status: {JSON.stringify(changes.oldValue.status)}</div>
								</div>
								<div className="font-medium mb-2">Deleted Analyses:</div>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Anvaya No</TableHead>
											<TableHead>Word</TableHead>
											<TableHead>Sentence</TableHead>
											<TableHead>Morph Analysis</TableHead>
											<TableHead>English Meaning</TableHead>
											<TableHead>Hindi Meaning</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{changes.oldValue.deletedAnalyses.map((analysis: DeletedAnalysis, index: number) => (
											<TableRow key={index}>
												<TableCell>{analysis.anvaya_no}</TableCell>
												<TableCell>{analysis.word}</TableCell>
												<TableCell>{analysis.sentno}</TableCell>
												<TableCell>{analysis.morph_analysis}</TableCell>
												<TableCell>{analysis.english_meaning}</TableCell>
												<TableCell>{analysis.hindi_meaning}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</>
						) : changes ? (
							<div className="space-y-4">
								<div className="font-medium">Changes:</div>
								<div className="text-sm space-y-2">
									<div className="grid grid-cols-2 gap-4">
										<div>
											<div className="font-medium text-destructive">Old Value:</div>
											<pre className="mt-1 p-2 bg-muted rounded-md overflow-x-auto">{JSON.stringify(changes.oldValue, null, 2)}</pre>
										</div>
										<div>
											<div className="font-medium text-green-600">New Value:</div>
											<pre className="mt-1 p-2 bg-muted rounded-md overflow-x-auto">{JSON.stringify(changes.newValue, null, 2)}</pre>
										</div>
									</div>
								</div>
							</div>
						) : (
							<div className="text-sm text-muted-foreground">No detailed changes available</div>
						)}
					</div>
				</DialogContent>
			</Dialog>
		);
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>History of Changes</CardTitle>
				<Button variant="outline" size="icon" onClick={() => fetchHistory(pagination.page)} disabled={loading}>
					<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
				</Button>
			</CardHeader>
			<CardContent>
				{loading ? (
					<div className="flex justify-center py-8">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				) : (
					<>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Time</TableHead>
									<TableHead>User</TableHead>
									<TableHead>Action</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Location</TableHead>
									<TableHead>Details</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{history.map((entry) => (
									<TableRow key={entry._id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEntryClick(entry)}>
										<TableCell>{format(new Date(entry.timestamp), "MMM d, yyyy HH:mm")}</TableCell>
										<TableCell>{entry.userName}</TableCell>
										<TableCell>
											<Badge variant={getActionColor(entry.action)}>{entry.action === "complete_delete" ? "Complete Deletion" : entry.action}</Badge>
										</TableCell>
										<TableCell>{entry.modelType}</TableCell>
										<TableCell>{formatLocation(entry)}</TableCell>
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
							<Button variant="outline" onClick={() => fetchHistory(pagination.page - 1)} disabled={pagination.page === 1}>
								<ChevronLeft className="h-4 w-4 mr-2" />
								Previous
							</Button>
							<span className="text-sm text-muted-foreground">
								Page {pagination.page} of {pagination.pages}
							</span>
							<Button variant="outline" onClick={() => fetchHistory(pagination.page + 1)} disabled={pagination.page === pagination.pages}>
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
