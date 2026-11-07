"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type RequestRow = {
	_id: string;
	userId: string;
	userName: string;
	books: string[];
	note?: string;
	status: "pending" | "approved" | "rejected";
	createdAt: string;
	reviewNote?: string | null;
	key?: { status: string; keyPrefix: string; lastUsedAt?: string | null } | null;
};

type GrantRow = {
	_id: string;
	userId: string;
	userName: string;
	book: string;
	grantedAt: string;
};

export default function ApiAccessAdmin() {
	const [status, setStatus] = useState("pending");
	const [requests, setRequests] = useState<RequestRow[]>([]);
	const [grants, setGrants] = useState<GrantRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});

	const load = async (nextStatus = status) => {
		setLoading(true);
		try {
			const response = await fetch(`/api/admin/api-access?status=${nextStatus}`);
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Failed to load requests");
			setRequests(data.requests || []);
			setGrants(data.grants || []);
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const act = async (body: Record<string, unknown>, id: string) => {
		setBusyId(id);
		try {
			const response = await fetch("/api/admin/api-access", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Action failed");
			toast.success("Updated");
			// After approve/reject the row leaves "pending" — jump to that filter
			// so the admin still sees the outcome and the grants list stays meaningful.
			if (body.action === "approve") {
				setStatus("approved");
				await load("approved");
			} else if (body.action === "reject") {
				setStatus("rejected");
				await load("rejected");
			} else {
				await load();
			}
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			setBusyId(null);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-3">
				<Select
					value={status}
					onValueChange={(value) => {
						setStatus(value);
						void load(value);
					}}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="pending">Pending</SelectItem>
						<SelectItem value="all">All</SelectItem>
						<SelectItem value="approved">Approved</SelectItem>
						<SelectItem value="rejected">Rejected</SelectItem>
					</SelectContent>
				</Select>
				<Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
					Refresh
				</Button>
			</div>

			{loading ? (
				<div className="flex justify-center py-12">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : requests.length === 0 ? (
				<p className="py-8 text-center text-sm text-muted-foreground">No requests found.</p>
			) : (
				<div className="space-y-3">
					{requests.map((request) => (
						<div key={request._id} className="rounded-lg border p-4 space-y-3">
							<div className="flex flex-wrap items-start justify-between gap-2">
								<div>
									<button
										type="button"
										className="font-medium text-left hover:underline"
										title={`${request.userId} (click to copy)`}
										onClick={async () => {
											await navigator.clipboard.writeText(request.userId);
											toast.success("User ID copied");
										}}
									>
										{request.userName || request.userId}
									</button>
								</div>
								<div className="flex items-center gap-2">
									<Badge variant="outline">{request.status}</Badge>
									{request.key && (
										<Badge variant="secondary">
											key {request.key.status}: {request.key.keyPrefix}…
										</Badge>
									)}
								</div>
							</div>
							<p className="text-sm">{request.books.join(", ")}</p>
							{request.note && (
								<p className="text-sm text-muted-foreground">{request.note}</p>
							)}
							<p className="text-xs text-muted-foreground">
								{new Date(request.createdAt).toLocaleString()}
							</p>

							{request.status === "pending" && (
								<div className="space-y-2">
									<Textarea
										placeholder="Optional reject note"
										value={rejectNotes[request._id] || ""}
										onChange={(e) =>
											setRejectNotes((prev) => ({
												...prev,
												[request._id]: e.target.value,
											}))
										}
									/>
									<div className="flex flex-wrap gap-2">
										<Button
											size="sm"
											disabled={busyId === request._id}
											onClick={() =>
												act({ action: "approve", requestId: request._id }, request._id)
											}
										>
											Approve
										</Button>
										<Button
											size="sm"
											variant="outline"
											disabled={busyId === request._id}
											onClick={() =>
												act(
													{
														action: "reject",
														requestId: request._id,
														reviewNote: rejectNotes[request._id] || "",
													},
													request._id
												)
											}
										>
											Reject
										</Button>
										<Button
											size="sm"
											variant="destructive"
											disabled={busyId === request._id}
											onClick={() =>
												act({ action: "revokeKey", userId: request.userId }, request._id)
											}
										>
											Revoke key
										</Button>
									</div>
								</div>
							)}

							{request.status !== "pending" && (
								<Button
									size="sm"
									variant="destructive"
									disabled={busyId === request._id}
									onClick={() =>
										act({ action: "revokeKey", userId: request.userId }, request._id)
									}
								>
									Revoke key
								</Button>
							)}
						</div>
					))}
				</div>
			)}

			<div className="space-y-2 pt-4">
				<h3 className="text-sm font-semibold">Active grants</h3>
				{grants.length === 0 ? (
					<p className="text-sm text-muted-foreground">No active grants.</p>
				) : (
					grants.map((grant) => (
						<div
							key={grant._id}
							className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
						>
							<span>
								{grant.book}{" "}
								<button
									type="button"
									className="text-muted-foreground hover:underline"
									title={`${grant.userId} (click to copy)`}
									onClick={async () => {
										await navigator.clipboard.writeText(grant.userId);
										toast.success("User ID copied");
									}}
								>
									({grant.userName || grant.userId})
								</button>
							</span>
							<Button
								size="sm"
								variant="outline"
								disabled={busyId === grant._id}
								onClick={() => act({ action: "revokeGrant", grantId: grant._id }, grant._id)}
							>
								Revoke grant
							</Button>
						</div>
					))
				)}
			</div>
		</div>
	);
}
