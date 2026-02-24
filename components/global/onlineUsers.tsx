"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, Users, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface OnlineUser {
	userID: string;
	name: string;
	perms: string;
	lastActiveAt: string;
}

export default function OnlineUsers() {
	const [users, setUsers] = useState<OnlineUser[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchOnlineUsers = async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/presence/online");
			if (!res.ok) throw new Error("Failed to fetch");
			const data = await res.json();
			setUsers(data.users || []);
		} catch (error) {
			console.error("Error fetching online users:", error);
			setUsers([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchOnlineUsers();
		const interval = setInterval(fetchOnlineUsers, 30 * 1000); // Refresh every 30s
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2">
					<Users className="h-5 w-5 text-muted-foreground" />
					<span className="text-sm font-medium text-muted-foreground">Online now</span>
					<span className="text-xl font-bold tabular-nums">{users.length}</span>
					<span className="text-xs text-muted-foreground">(active in last 5 min)</span>
				</div>
				<Button variant="outline" size="sm" onClick={fetchOnlineUsers} disabled={loading}>
					<RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
					Refresh
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Online Users</CardTitle>
					<CardDescription>
						Users who have been active in the last 5 minutes. Presence is updated when users browse the app.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{loading && users.length === 0 ? (
						<div className="flex justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : users.length === 0 ? (
						<div className="py-12 text-center text-muted-foreground">
							<Users className="mx-auto h-12 w-12 opacity-50 mb-2" />
							<p>No users online at the moment</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-8"></TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Last Active</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{users.map((u) => (
									<TableRow key={u.userID}>
										<TableCell>
											<Circle className="h-2.5 w-2.5 fill-green-500 text-green-500" />
										</TableCell>
										<TableCell className="font-medium">{u.name}</TableCell>
										<TableCell>{u.perms}</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{formatDistanceToNow(new Date(u.lastActiveAt), { addSuffix: true })}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
