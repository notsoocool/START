"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkX } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

interface BookmarkButtonProps {
	analysisID: string;
	shlokaID: string;
}

export default function BookmarkButton({ analysisID, shlokaID }: BookmarkButtonProps) {
	const [isBookmarked, setIsBookmarked] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const { user, isLoaded } = useUser();

	useEffect(() => {
		const checkBookmarkStatus = async () => {
			if (!user || !shlokaID) return;

			try {
				const response = await fetch(`/api/bookmarks?shlokaID=${encodeURIComponent(shlokaID)}`);
				if (response.ok) {
					const { isBookmarked } = await response.json();
					setIsBookmarked(isBookmarked);
				}
			} catch (error) {
				console.error("Error checking bookmark status:", error);
			}
		};

		checkBookmarkStatus();
	}, [user, shlokaID]);

	const toggleBookmark = async () => {
		if (!user) return;

		setIsLoading(true);
		try {
			if (isBookmarked) {
				const response = await fetch(`/api/bookmarks?shlokaID=${encodeURIComponent(shlokaID)}`, {
					method: "DELETE",
				});
				if (response.ok) {
					setIsBookmarked(false);
					toast.success("Bookmark removed");
				}
			} else {
				const response = await fetch("/api/bookmarks", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						analysisID,
						shlokaID,
					}),
				});

				if (response.ok) {
					setIsBookmarked(true);
					toast.success("Bookmark added");
				} else if (response.status === 400) {
					setIsBookmarked(true);
					toast.info("Already bookmarked");
				}
			}
		} catch (error) {
			console.error("Error:", error);
			toast.error("Failed to update bookmark");
		} finally {
			setIsLoading(false);
		}
	};

	if (!isLoaded) {
		return (
			<Button variant="ghost" size="icon" disabled>
				<Bookmark className="h-5 w-5" />
			</Button>
		);
	}

	return (
		<Button variant="ghost" size="icon" onClick={toggleBookmark} disabled={isLoading} className={isBookmarked ? "text-yellow-500" : "text-gray-500"}>
			{isBookmarked ? <Bookmark className="h-5 w-5" /> : <BookmarkX className="h-5 w-5" />}
		</Button>
	);
}
