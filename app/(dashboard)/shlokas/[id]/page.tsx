"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { ExclamationTriangleIcon, SliderIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function ShlokaPage() {
	const { id } = useParams(); // Get the shloka ID from the URL
	const [shloka, setShloka] = useState<Shloka | null>(null);
	const [loading, setLoading] = useState(true);
	const [chapter, setChapter] = useState<any>(null);
	const [opacity, setOpacity] = useState(0.5); // Default opacity value
	const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
	const [updatedData, setUpdatedData] = useState<any[]>([]);
	const [tsvData, setTsvData] = useState<string | null>(null);
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Fetch the shloka and chapter data by ID
	useEffect(() => {
		const fetchShlokaData = async () => {
			if (!id) return;
			try {
				setLoading(true);
				const response = await fetch(`/api/ahShloka/${id}`);
				const shlokaData = await response.json();
				setShloka(shlokaData);

				const chapterResponse = await fetch(
					`/api/chaponeAH/${shlokaData.slokano}`
				);
				const chapterData = await chapterResponse.json();
				setChapter(chapterData);

				// Initialize updatedData with chapter data
				setUpdatedData(
					chapterData.data.map((item: any) => ({ ...item }))
				);
			} catch (error) {
				console.error("Error fetching shloka or chapter:", error);
			} finally {
				setLoading(false);
			}
		};
		fetchShlokaData();
	}, [id]);

	const handleOpacityChange = (value: number[]) => {
		setOpacity(value[0] / 100); // Convert slider value to opacity
	};

	const handleSave = async (index: number, anvaya_no: any) => {
		try {
			const updatedValue = updatedData[index]; // Get the updated value for the specific index
			const response = await fetch(`/api/chaponeAH/${shloka?.slokano}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					index: index, // Send the specific index being updated
					...updatedValue, // Send all updated values for that index
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to save changes");
			}

			const updatedChapter = await response.json();
			console.log("Updated chapter:", updatedChapter);

			toast.success(`Changes saved successfully for index ${anvaya_no}`);
		} catch (error) {
			console.error("Error saving changes:", error);
			toast.error("Failed to save changes. Please try again.");
		}
	};

	const jsonToTsv = (data: any[]): string => {
		const tsvRows = data.map(
			(row) =>
				Object.values(row)
					.map((value) => `"${value}"`)
					.join("\t") // Join values with tabs
		);
		const header = Object.keys(data[0]).join("\t"); // Header row (keys)
		return [header, ...tsvRows].join("\n"); // Join header and rows with newline
	};

	const handleGenerateGraph = async () => {
        // Select only the fields you want to pass
        const selectedFields = [
          'anvaya_no',
          'word',
          'poem',
          'sandhied_word',
          'morph_analysis',
          'morph_in_context',
          'kaaraka_sambandha',
          'possible_relations',
          'bgcolor',
        ];
      
        // Filter the data to include only the selected fields
        const filteredData = chapter.data.map((item: any, index: number) => {
          const updatedItem = updatedData[index] || {};
      
          // Create a new object with only the selected fields
          const filteredItem: any = {};
          selectedFields.forEach((field) => {
            filteredItem[field] = updatedItem[field] ?? item[field];
          });
      
          return filteredItem;
        });
      
        // Convert the filtered data to TSV format
        const tsv = jsonToTsv(filteredData);
        setTsvData(tsv);
      
        // Now pass the TSV data to the graph generation
        await handleSubmitGraph(tsv);
      };

	const handleSubmitGraph = async (tsvData: string) => {
		const formData = new FormData();
		formData.append("tsv", tsvData);

		try {
			const response = await fetch(
				"https://sanskrit.uohyd.ac.in/cgi-bin/scl/Post-editing/ViewGraph.cgi",
				{
					method: "POST",
					body: formData,
				}
			);

			if (!response.ok) {
				throw new Error(
					"Error uploading TSV data: " + response.statusText
				);
			}

			const result = await response.text();
			setErrorMessage(null);

			// Extract image URL from response
			const imageUrlMatch = result.match(/<img src="([^"]+)"/);
			if (imageUrlMatch && imageUrlMatch[1]) {
				setImageUrl(`https://sanskrit.uohyd.ac.in${imageUrlMatch[1]}`);
			}
		} catch (error) {
			setErrorMessage(
				"Error uploading TSV data: " + (error as Error).message
			);
			setImageUrl(null);
		}
	};

	// Render loading state
	if (loading) {
		return (
			<div className="max-w-screen-2xl mx-auto w-full p-8">
				<Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col justify-between duration-300">
					<CardHeader className="border-b border-primary-100">
						<Skeleton className="h-6 w-40" />
					</CardHeader>
					<CardContent>
						<div className="h-[300px] w-full flex items-center justify-center">
							<Loader2 className="size-6 text-slate-300 animate-spin" />
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Render error state if shloka is not found
	if (!shloka || !chapter) {
		return (
			<div className="max-w-screen-2xl mx-auto w-full">
				<Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col justify-between duration-300">
					<CardHeader className="border-b border-primary-100">
						<CardTitle>Shloka not found</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-[300px] w-full flex items-center justify-center">
							<p className="text-lg text-slate-300">
								<ExclamationTriangleIcon className="w-6 h-6 mr-2" />
								The shloka you are looking for does not exist.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Render the UI with the Shloka
	return (
		<div className="p-8">
			<Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col justify-between duration-300">
				<CardHeader className="border-b border-primary-100">
					<CardTitle>
						Chapter {shloka.chaptno} - Shloka {shloka.slokano}
					</CardTitle>
				</CardHeader>
				<CardContent className="p-10">
					{/* Original Shloka */}
					<div>
						<h3 className="text-lg font-bold mb-4">
							Original Shloka:
						</h3>
						<div className="text-sm flex flex-col gap-2">
							<p>{shloka.spart1}</p>
							{shloka.spart2 && <p>{shloka.spart2}</p>}
						</div>
					</div>

					{/* Processed Segments Table */}
					<h3 className="text-lg font-bold mb-4 mt-8">
						Processed Segments:
					</h3>
					<div className="w-full flex justify-end">
						<Popover>
							<PopoverTrigger asChild>
								<Button variant="outline">
									<SliderIcon />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-80">
								<div className="space-y-4">
									<h4 className="font-medium leading-none">
										Adjust Opacity
									</h4>
									<Slider
										defaultValue={[opacity * 100]}
										max={100}
										step={1}
										onValueChange={handleOpacityChange}
									/>
									<div className="flex justify-between items-center">
										<span className="text-sm text-muted-foreground">
											Current value:
										</span>
										<span className="font-medium">
											{Math.round(opacity * 100)}
										</span>
									</div>
								</div>
							</PopoverContent>
						</Popover>
					</div>

					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Index</TableHead>
								<TableHead>Word</TableHead>
								<TableHead>Morph Analysis</TableHead>
								<TableHead>Morph In Context</TableHead>
								<TableHead>Kaaraka Sambandha</TableHead>
								<TableHead>Possible Relations</TableHead>
								<TableHead>Hindi Meaning</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{chapter.data && chapter.data.length > 0 ? (
								chapter.data.map(
									(processed: any, procIndex: any) => {
										const currentProcessedData =
											updatedData[procIndex];

										return (
											<TableRow
												key={procIndex}
												onMouseEnter={() =>
													setHoveredRowIndex(
														procIndex
													)
												}
												onMouseLeave={() =>
													setHoveredRowIndex(null)
												}
												style={{
													backgroundColor: `${
														processed.bgcolor
													}${Math.round(
														(hoveredRowIndex ===
														procIndex
															? Math.min(
																	opacity +
																		0.2,
																	1
															  )
															: opacity) * 255
													)
														.toString(16)
														.padStart(2, "0")}`, // Convert opacity to hex
												}}
											>
												<TableCell>
													{processed.anvaya_no}
												</TableCell>
												<TableCell>
													{processed.word}
												</TableCell>
												<TableCell>
													{processed.morph_analysis}
												</TableCell>
												<TableCell>
													<Select
														value={
															currentProcessedData?.morph_in_context
														}
														onValueChange={(
															value
														) => {
															const newData = [
																...updatedData,
															];
															if (
																currentProcessedData
															) {
																newData[
																	procIndex
																].morph_in_context =
																	value; // Update morph_in_context
																setUpdatedData(
																	newData
																);
															}
														}}
													>
														<SelectTrigger className="w-[180px]">
															<SelectValue
																placeholder={
																	processed.morph_analysis
																}
															/>
														</SelectTrigger>
														<SelectContent>
															{processed.morph_analysis
																.split("/")
																.map(
																	(
																		morph: string,
																		index: number
																	) => (
																		<SelectItem
																			key={
																				index
																			}
																			value={morph.trim()}
																		>
																			{morph.trim()}
																		</SelectItem>
																	)
																)}
														</SelectContent>
													</Select>
												</TableCell>
												<TableCell>
													<Select
														onValueChange={(
															value
														) => {
															const newData = [
																...updatedData,
															];
															if (
																currentProcessedData
															) {
																newData[
																	procIndex
																].kaaraka_sambandha =
																	value; // Update kaaraka_sambandha
																setUpdatedData(
																	newData
																);
															}
														}}
													>
														<SelectTrigger className="w-[180px]">
															<SelectValue
																placeholder={
																	processed.kaaraka_sambandha
																}
															/>
														</SelectTrigger>
														<SelectContent>
															{processed.possible_relations
																.split("#")
																.map(
																	(
																		relation: string,
																		index: number
																	) => (
																		<SelectItem
																			key={
																				index
																			}
																			value={relation.trim()}
																		>
																			{relation.trim()}
																		</SelectItem>
																	)
																)}
														</SelectContent>
													</Select>
												</TableCell>
												<TableCell>
													{
														processed.possible_relations
													}
												</TableCell>
												<TableCell>
													{processed.hindi_meaning}
												</TableCell>
												<TableCell>
													<Button
														onClick={() =>
															handleSave(
																procIndex,
																processed.anvaya_no
															)
														} // Save changes for the current index
														className="w-full"
													>
														Save
													</Button>
												</TableCell>
											</TableRow>
										);
									}
								)
							) : (
								<TableRow>
									<TableCell
										colSpan={7}
										className="text-center"
									>
										No data available
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
					<Button onClick={handleGenerateGraph} className="mb-4">
						Generate Graph
					</Button>
					{imageUrl && <img src={imageUrl} alt="Generated Graph" />}
					{errorMessage && (
						<p className="text-red-500">{errorMessage}</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
