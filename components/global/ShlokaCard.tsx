"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BookOpen } from "lucide-react";
import { Share2Icon } from "@radix-ui/react-icons";
import BookmarkButton from "./BookmarkButton";
import { toPng } from 'html-to-image';
import { useRef } from 'react';

interface ShlokaCardProps {
	book: string | string[];
	chaptno: string;
	shloka: {
		_id: string;
		slokano: string;
		spart: string;
	};
	analysisID: string;
}

export function ShlokaCard({ book, chaptno, shloka, analysisID }: ShlokaCardProps) {
	const shlokaRef = useRef<HTMLDivElement>(null);

	const handleShare = async () => {
		if (!shlokaRef.current) return;

		try {
			const dataUrl = await toPng(shlokaRef.current, {
				quality: 1.0,
				backgroundColor: 'white',
			});

			// For mobile devices, use native share if available
			if (navigator.share) {
				const blob = await (await fetch(dataUrl)).blob();
				const file = new File([blob], 'shloka.png', { type: 'image/png' });
				await navigator.share({
					files: [file],
					title: `${book} ${chaptno}.${shloka.slokano}`,
				});
			} else {
				// Fallback to download
				const link = document.createElement('a');
				link.download = `shloka-${chaptno}-${shloka.slokano}.png`;
				link.href = dataUrl;
				link.click();
			}
		} catch (error) {
			console.error('Error sharing:', error);
		}
	};

	console.log("ShlokaCard props:", {
		shlokaID: shloka._id,
		analysisID,
	});

	return (
		<Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
			<div ref={shlokaRef}>
				<CardHeader className="border-b border-border flex flex-row justify-between items-center h-16">
					<div className="flex items-center gap-2">
						<CardTitle className="text-lg font-medium">
							{decodeURIComponent(typeof book === "string" ? book : book[0])
								.split("_")
								.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
								.join(" ")}
						</CardTitle>
						<Badge variant="outline" className="text-xs">
							{chaptno}.{shloka?.slokano}
						</Badge>
					</div>
					<BookmarkButton analysisID={analysisID} shlokaID={shloka._id} />
				</CardHeader>
				<CardContent className="p-6">
					<div className="space-y-4">
						<div className="text-center space-y-2">
							{shloka?.spart.split("#").map((part, index) => (
								<p key={index} className="text-lg font-sanskrit leading-relaxed">
									{part.trim()}
								</p>
							))}
						</div>
						<Separator className="my-4" />
						<div className="flex justify-center gap-4">
							<Button variant="outline" size="sm">
								<BookOpen className="h-4 w-4 mr-2" />
								View Commentary
							</Button>
							<Button variant="outline" size="sm" onClick={handleShare}>
								<Share2Icon className="h-4 w-4 mr-2" />
								Share
							</Button>
						</div>
					</div>
				</CardContent>
			</div>
		</Card>
	);
}
