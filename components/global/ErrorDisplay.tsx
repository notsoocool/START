"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface ErrorDisplayProps {
	error: {
		type: string;
		message: string;
	};
	onBack?: () => void;
}

export function ErrorDisplay({ error, onBack }: ErrorDisplayProps) {
	const [isContactingAdmin, setIsContactingAdmin] = useState(false);
	const [currentUser, setCurrentUser] = useState<{ perms: string } | null>(null);

	// Fetch current user's permissions
	useEffect(() => {
		const fetchCurrentUser = async () => {
			try {
				const response = await fetch("/api/getCurrentUser");
				const data = await response.json();
				if (response.ok) {
					setCurrentUser({ perms: data.perms });
				}
			} catch (error) {
				console.error("Error fetching current user:", error);
			}
		};
		fetchCurrentUser();
	}, []);

	const handleContactAdmin = async () => {
		try {
			setIsContactingAdmin(true);
			const response = await fetch("/api/notifications/send", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					// Always send error reports to Root users only
					recipientID: "admin",
					subject: `Error Report: ${error.type}`,
					message: `Error Type: ${error.type}\nError Message: ${error.message}\n\nThis error was reported by ${
						currentUser?.perms === "Root" ? "a Root user" : "a user"
					}.`,
					isErrorReport: true,
					shouldDeleteAfterRead: true,
					deleteAfterHours: 24,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to send error report");
			}

			toast.success("Error report sent to Root users successfully!");
		} catch (error) {
			console.error("Error sending report:", error);
			toast.error(error instanceof Error ? error.message : "Failed to send error report");
		} finally {
			setIsContactingAdmin(false);
		}
	};

	return (
		<div className="max-w-screen-2xl mx-auto w-full p-8">
			<Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col justify-between duration-300">
				<CardHeader className="border-b border-primary-100">
					<CardTitle className="flex items-center gap-2">
						<ExclamationTriangleIcon className="h-5 w-5 text-destructive" />
						Error Loading Content
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-[300px] w-full flex flex-col items-center justify-center gap-4">
						<p className="text-lg text-slate-700">{error.message}</p>
						<div className="flex gap-4">
							{onBack && (
								<Button onClick={onBack} variant="outline">
									Go Back
								</Button>
							)}
							<Button onClick={handleContactAdmin} disabled={isContactingAdmin} className="bg-destructive hover:bg-destructive/90">
								{isContactingAdmin ? "Sending..." : "Contact Admin"}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
