"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RenameChapter() {
	const [book, setBook] = useState("");
	const [part1, setPart1] = useState("");
	const [part2, setPart2] = useState("");
	const [oldChaptno, setOldChaptno] = useState("");
	const [newChaptno, setNewChaptno] = useState("");
	const [loading, setLoading] = useState(false);

	const handleRename = async () => {
		if (!book.trim() || !oldChaptno.trim() || !newChaptno.trim()) {
			toast.error("Book, old chapter, and new chapter are required");
			return;
		}

		try {
			setLoading(true);
			const response = await fetch("/api/admin/rename-chapter", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"DB-Access-Key": process.env.NEXT_PUBLIC_DBI_KEY || "",
				},
				body: JSON.stringify({
					book: book.trim(),
					part1: part1.trim() || null,
					part2: part2.trim() || null,
					oldChaptno: oldChaptno.trim(),
					newChaptno: newChaptno.trim(),
				}),
			});

			const data = await response.json();

			if (response.ok) {
				toast.success(
					`Chapter updated. Shlokas: ${data.shlokasUpdated}, analysis rows: ${data.analysisUpdated}.`
				);
				setOldChaptno("");
				setNewChaptno("");
			} else {
				toast.error(data.message || "Failed to rename chapter");
			}
		} catch (error) {
			console.error(error);
			toast.error("Failed to rename chapter");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-4 max-w-xl">
			<p className="text-sm text-muted-foreground">
				Renames <code className="text-xs bg-muted px-1 rounded">chaptno</code> for all
				shlokas and analysis rows under the same book,{" "}
				<code className="text-xs bg-muted px-1 rounded">part1</code>, and{" "}
				<code className="text-xs bg-muted px-1 rounded">part2</code>. Leave part fields
				empty when they are null (e.g. चरकसंहिता with no parts).{" "}
				<code className="text-xs bg-muted px-1 rounded">slokano</code> values are unchanged.
			</p>
			<div className="space-y-2">
				<label className="text-sm font-medium">Book</label>
				<Input
					value={book}
					onChange={(e) => setBook(e.target.value)}
					placeholder="e.g. चरकसंहिता"
					disabled={loading}
				/>
			</div>
			<div className="space-y-2">
				<label className="text-sm font-medium">Part 1 (optional — empty = null)</label>
				<Input
					value={part1}
					onChange={(e) => setPart1(e.target.value)}
					placeholder="Leave empty if null"
					disabled={loading}
				/>
			</div>
			<div className="space-y-2">
				<label className="text-sm font-medium">Part 2 (optional — empty = null)</label>
				<Input
					value={part2}
					onChange={(e) => setPart2(e.target.value)}
					placeholder="Leave empty if null"
					disabled={loading}
				/>
			</div>
			<div className="space-y-2">
				<label className="text-sm font-medium">Current chapter number</label>
				<Input
					value={oldChaptno}
					onChange={(e) => setOldChaptno(e.target.value)}
					placeholder="e.g. 01"
					disabled={loading}
				/>
			</div>
			<div className="space-y-2">
				<label className="text-sm font-medium">New chapter number</label>
				<Input
					value={newChaptno}
					onChange={(e) => setNewChaptno(e.target.value)}
					placeholder="e.g. 02"
					disabled={loading}
				/>
			</div>
			<Button
				onClick={handleRename}
				disabled={loading || !book.trim() || !oldChaptno.trim() || !newChaptno.trim()}
				className="w-full sm:w-auto"
			>
				{loading ? (
					<>
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						Updating…
					</>
				) : (
					"Rename chapter"
				)}
			</Button>
		</div>
	);
}
