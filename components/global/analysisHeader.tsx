"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen } from "lucide-react";
import { PencilIcon } from "lucide-react";
import { SliderIcon } from "@radix-ui/react-icons";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface HeaderProps {
	book: string;
	part1: string;
	part2: string;
	chaptno: string;
	id: string;
	shloka: any;
	availableShlokas: any[];
	selectedColumns: string[];
	columnOptions: { id: string; label: string }[];
	selectedDictionary: string;
	handleShlokaChange: (shlokaId: string, chapter: string, part1: string, part2: string) => void;
	handleColumnSelect: (columnId: string) => void;
	handleOpacityChange: (value: number[]) => void;
	setSelectedDictionary: (value: string) => void;
	handleGenerateGraph: () => void;
	chapters: string[];
	onChapterChange: (chapter: string) => Promise<any[]>;
}

export function Header({
	book,
	part1,
	part2,
	chaptno,
	id,
	shloka,
	availableShlokas,
	selectedColumns,
	columnOptions,
	selectedDictionary,
	handleShlokaChange,
	handleColumnSelect,
	handleOpacityChange,
	setSelectedDictionary,
	handleGenerateGraph,
	chapters,
	onChapterChange,
}: HeaderProps) {
	const [chapterShlokas, setChapterShlokas] = useState(availableShlokas);
	const [isLoading, setIsLoading] = useState(false);
	const [isChangingChapter, setIsChangingChapter] = useState(false);
	const [displayChapter, setDisplayChapter] = useState(chaptno);

	// Update displayChapter when chaptno prop changes
	useEffect(() => {
		setDisplayChapter(chaptno);
	}, [chaptno]);

	const handleChapterSelect = async (newChapter: string) => {
		if (newChapter === displayChapter) return;
		console.log("Changing chapter from", displayChapter, "to", newChapter);
		setIsLoading(true);
		setIsChangingChapter(true);
		// Immediately update the display chapter
		setDisplayChapter(newChapter);
		try {
			const shlokas = await onChapterChange(newChapter);
			console.log("Received shlokas for new chapter:", shlokas);
			setChapterShlokas(shlokas);
			// Add a small delay to show the transition
			await new Promise((resolve) => setTimeout(resolve, 300));
		} catch (error) {
			console.error("Error fetching shlokas:", error);
			// Revert display chapter if there's an error
			setDisplayChapter(chaptno);
		} finally {
			setIsLoading(false);
			setIsChangingChapter(false);
		}
	};

	const handleShlokaSelect = (shlokaId: string) => {
		console.log("Selecting shloka:", shlokaId, "from chapter:", chaptno);
		// Find the selected shloka to get its part1 and part2 values
		const selectedShloka = chapterShlokas.find((s) => s._id === shlokaId);
		console.log("Found selected shloka:", selectedShloka);
		if (!selectedShloka) {
			console.error("Selected shloka not found in available shlokas");
			return;
		}

		// Use the shloka's own chapter number instead of the selected chapter
		const shlokaChapter = selectedShloka.chaptno;
		// Use the shloka's part1 and part2 values, or fallback to current values
		const part1Value = selectedShloka.part1 || part1;
		const part2Value = selectedShloka.part2 || part2;

		// Also update the available shlokas for the new chapter
		onChapterChange(shlokaChapter)
			.then((newShlokas) => {
				setChapterShlokas(newShlokas);
			})
			.catch((error) => {
				console.error("Error fetching shlokas for new chapter:", error);
			});

		console.log("Using values for navigation:", {
			shlokaId,
			chapter: shlokaChapter,
			part1: part1Value,
			part2: part2Value,
		});

		// Pass all the necessary values to handleShlokaChange
		handleShlokaChange(shlokaId, shlokaChapter, part1Value, part2Value);
	};

	// Update chapterShlokas when availableShlokas changes
	useEffect(() => {
		setChapterShlokas(availableShlokas);
	}, [availableShlokas]);

	return (
		<div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center w-full">
			<div className="space-y-2">
				<h1 className="text-2xl font-bold tracking-tight">Analysis Dashboard</h1>
				<div className="flex items-center gap-4">
					<div className="relative">
						<Select value={displayChapter} onValueChange={handleChapterSelect} disabled={isLoading}>
							<SelectTrigger className={`w-[150px] transition-all duration-300 ${isChangingChapter ? "bg-muted" : ""}`}>
								<div className="flex items-center gap-2">
									{isChangingChapter && <Loader2 className="h-4 w-4 animate-spin" />}
									<SelectValue>Chapter {displayChapter}</SelectValue>
								</div>
							</SelectTrigger>
							<SelectContent>
								{chapters && chapters.length > 0 ? (
									chapters.map((chapter) => (
										<SelectItem key={chapter} value={chapter} className={chapter === displayChapter ? "bg-muted" : ""}>
											Chapter {chapter}
										</SelectItem>
									))
								) : (
									<SelectItem value="none" disabled>
										No chapters available
									</SelectItem>
								)}
							</SelectContent>
						</Select>
						{isChangingChapter && <div className="absolute inset-0 bg-muted/50 rounded-md animate-pulse" />}
					</div>

					<div className="relative">
						<Select value={id} onValueChange={handleShlokaSelect} disabled={isLoading}>
							<SelectTrigger className={`w-[150px] transition-all duration-300 ${isLoading ? "bg-muted" : ""}`}>
								<div className="flex items-center gap-2">
									{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
									<SelectValue>{shloka ? `Shloka ${shloka.slokano}` : "Select Shloka"}</SelectValue>
								</div>
							</SelectTrigger>
							<SelectContent>
								{chapterShlokas.map((s) => (
									<SelectItem key={s._id} value={s._id} className={s._id === id ? "bg-muted" : ""}>
										Shloka {s.slokano}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{isLoading && <div className="absolute inset-0 bg-muted/50 rounded-md animate-pulse" />}
					</div>
				</div>
			</div>

			<div className="gap-4 xl:flex xl:flex-row md:grid md:grid-cols-2 sm:flex sm:flex-col md:w-[70%] sm:w-full sm:items-center">
				<Popover>
					<PopoverTrigger asChild>
						<Button variant="outline" className="w-[200px] justify-center sm:w-[75%]">
							<SliderIcon className="mr-2 h-4 w-4" />
							Customize Columns
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-[200px] p-4">
						<div className="space-y-4">
							<h4 className="font-medium leading-none">Toggle Columns</h4>
							<div className="space-y-2">
								{columnOptions.map((column) => (
									<div key={column.id} className="flex items-center space-x-2">
										<Checkbox id={column.id} checked={selectedColumns.includes(column.id)} onCheckedChange={() => handleColumnSelect(column.id)} />
										<Label htmlFor={column.id}>{column.label}</Label>
									</div>
								))}
							</div>
						</div>
					</PopoverContent>
				</Popover>

				<Popover>
					<PopoverTrigger asChild>
						<Button variant="outline" className="w-[200px] justify-center sm:w-[75%]">
							<PencilIcon className="mr-2 h-4 w-4" />
							Color Opacity
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-[200px] p-4">
						<div className="space-y-4">
							<h4 className="font-medium leading-none">Adjust Opacity</h4>
							<Slider defaultValue={[50]} max={100} step={1} className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4" onValueChange={handleOpacityChange} />
						</div>
					</PopoverContent>
				</Popover>

				<Popover>
					<PopoverTrigger asChild>
						<Button variant="outline" className="w-[200px] justify-center sm:w-[75%]">
							<BookOpen className="mr-2 h-4 w-4" />
							Select Dictionary
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-[200px] p-4">
						<div className="space-y-4">
							<h4 className="font-medium leading-none">Choose Dictionary</h4>
							<Select value={selectedDictionary} onValueChange={setSelectedDictionary}>
								<SelectTrigger>
									<SelectValue placeholder="Select Dictionary" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Apte's Skt-Hnd Dict">Apte Sanskrit-Hindi</SelectItem>
									<SelectItem value="Monier Williams' Skt-Eng Dict">Monier Williams Sanskrit-English</SelectItem>
									<SelectItem value="Heritage Skt-French Dict">Heritage Sanskrit-French</SelectItem>
									<SelectItem value="Cappeller's Skt-Ger Dict">Cappeller Sanskrit-German</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</PopoverContent>
				</Popover>

				<Button onClick={handleGenerateGraph} className="w-[200px] justify-center sm:w-[75%]">
					Generate Graph
				</Button>
			</div>
		</div>
	);
}
