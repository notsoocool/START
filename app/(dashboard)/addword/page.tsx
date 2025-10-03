"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AddWordPage() {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [iframeHeight, setIframeHeight] = useState(800);
	const [permissions, setPermissions] = useState<any>(null);
	const [permsLoading, setPermsLoading] = useState<boolean>(true);

	useEffect(() => {
		// Fetch current user permissions
		const run = async () => {
			try {
				const res = await fetch("/api/getCurrentUser");
				if (!res.ok) throw new Error("Not authenticated");
				const data = await res.json();
				setPermissions(data.perms);
			} catch (e) {
				setPermissions(null);
			} finally {
				setPermsLoading(false);
			}
		};
		run();

		const handleMessage = (event: MessageEvent) => {
			// Only accept messages from the Google Form
			if (event.origin !== "https://docs.google.com") return;

			// Google Forms sends height information
			if (event.data && typeof event.data === "string") {
				try {
					const data = JSON.parse(event.data);
					if (data.height) {
						setIframeHeight(data.height);
					}
				} catch (e) {
					// Ignore parsing errors
				}
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	if (permsLoading) {
		return (
			<div className="container mx-auto p-6 space-y-8">
				<Card>
					<CardHeader>
						<CardTitle>Loading</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-4">
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-5 w-24" />
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (permissions === "User") {
		return (
			<div className="container mx-auto p-6 space-y-8">
				<Card>
					<CardHeader>
						<CardTitle>Access Restricted</CardTitle>
					</CardHeader>
					<CardContent>
						You are not an annotator or editor. Kindly get assigned your roles from the admin.
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="w-full flex justify-center p-4">
			<iframe
				ref={iframeRef}
				src="https://docs.google.com/forms/d/e/1FAIpQLSec35rPL6Je8jL53mrG6-WX_AbjxniRD-nGFO2KQaGGcx85-w/viewform?embedded=true"
				width="640"
				height={iframeHeight}
				style={{ border: "none" }}
				title="Add Word Form"
			>
				Loading...
			</iframe>
		</div>
	);
}
