import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, ChevronLeft, ChevronRight, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useHistory } from "@/lib/hooks/use-api";

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
	const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
	const [showDetailsDialog, setShowDetailsDialog] = useState(false);
	const [page, setPage] = useState(1);
	const { data, isLoading, error, refetch } = useHistory(page, 20);
	const history = data?.history || [];
	const pagination = data?.pagination || { total: 0, page: 1, limit: 20, pages: 0 };

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

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
		refetch();
	};

	const renderDetailsDialog = () => {
		if (!selectedEntry) return null;

		const changes = selectedEntry.details.changes;
		const isCompleteDelete = selectedEntry.action === "complete_delete";

		return (
			<Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
				<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{selectedEntry.action === "complete_delete" ? "Complete Deletion Details" : "Change Details"}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="text-sm text-muted-foreground">Location: {formatLocation(selectedEntry)}</div>

						{isCompleteDelete && changes?.[0]?.oldValue?.deletedAnalyses ? (
							<>
								<div className="font-medium mb-2">Deleted Shloka:</div>
								<div className="text-sm mb-4">
									<div>Slokano: {changes[0].oldValue.slokano}</div>
									<div>Status: {JSON.stringify(changes[0].oldValue.status)}</div>
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
										{changes[0].oldValue.deletedAnalyses.map((analysis: DeletedAnalysis, index: number) => (
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
						) : changes && changes.length > 0 ? (
							<div className="space-y-4">
								<div>
									<div className="font-medium mb-1">Changed fields:</div>
									<div className="flex flex-wrap gap-2 mb-2">
										{changes.map((change, idx) => (
											<span key={idx} className="px-2 py-1 bg-muted rounded text-sm font-mono border">
												{change.field}
											</span>
										))}
									</div>
								</div>
								<div className="font-medium">Details:</div>
								<div className="text-sm space-y-2">
									{changes.map((change, idx) => (
										<div key={idx} className="mb-4">
											<div className="font-semibold mb-1">{change.field}</div>
											<div className="grid grid-cols-2 gap-4">
												<div>
													<div className="font-medium text-destructive">Old Value:</div>
													<pre className="mt-1 p-2 bg-muted rounded-md overflow-x-auto">{JSON.stringify(change.oldValue, null, 2)}</pre>
												</div>
												<div>
													<div className="font-medium text-green-600">New Value:</div>
													<pre className="mt-1 p-2 bg-muted rounded-md overflow-x-auto">{JSON.stringify(change.newValue, null, 2)}</pre>
												</div>
											</div>
										</div>
									))}
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
				<CardTitle className="text-lg font-semibold">
					History of Changes
				</CardTitle>
				<Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
					<RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
				</Button>
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
									<TableHead>Type</TableHead>
									<TableHead>Location</TableHead>
									<TableHead>Details</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{history.map((entry: HistoryEntry) => (
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
							<Button variant="outline" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>
								<ChevronLeft className="h-4 w-4 mr-2" />
								Previous
							</Button>
							<span className="text-sm text-muted-foreground">
								Page {pagination.page} of {pagination.pages}
							</span>
							<Button variant="outline" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.pages}>
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
