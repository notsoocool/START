"use client";
import React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraphDisplay } from "@/components/global/GraphDisplay";
import { SliderIcon } from "@radix-ui/react-icons";
import axios from "axios";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { colorMapping } from "@/lib/constants";

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

// Add the hexToRgb helper function
const hexToRgb = (hex: string) => {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "0, 0, 0";
};

export default function ShlokaPage() {
	const [shlokaInput, setShlokaInput] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(false);
	const [processedShlokas, setProcessedShlokas] = useState<any[]>([]);
	const [analysisData, setAnalysisData] = useState<any[]>([]);
	const [permissions, setPermissions] = useState(null);
	const [graphUrls, setGraphUrls] = useState<{ [key: string]: string }>({});
	const [zoomLevels, setZoomLevels] = useState<{ [key: string]: number }>({});
	const [opacity, setOpacity] = useState(0.5); // Default opacity value
	const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [editedSandhiSplit, setEditedSandhiSplit] = useState<string>(""); // New state for editing
	const [selectedColumns, setSelectedColumns] = useState<string[]>([
		"index",
		"word",
		"poem",
		"morph_analysis",
		"morph_in_context",
		"kaaraka_sambandha",
		"possible_relations",
		"hindi_meaning",
	]);

	const columnOptions = [
		{ id: "index", label: "Index" },
		{ id: "word", label: "Word" },
		{ id: "poem", label: "Prose Index" },
		{ id: "sandhied_word", label: "Sandhied Word" },
		{ id: "morph_analysis", label: "Morph Analysis" },
		{ id: "morph_in_context", label: "Morph In Context" },
		{ id: "kaaraka_sambandha", label: "Kaaraka Relation" },
		{ id: "possible_relations", label: "Possible Relations" },
		{ id: "hindi_meaning", label: "Hindi Meaning" },
		{ id: "bgcolor", label: "Color Code" },
	];

	const handleColumnSelect = (column: string) => {
		setSelectedColumns((prevSelected) => (prevSelected.includes(column) ? prevSelected.filter((item) => item !== column) : [...prevSelected, column]));
	};

	const ColumnSelector = () => (
		<div className="flex flex-wrap gap-2 mb-4">
			{columnOptions.map((option) => (
				<Button key={option.id} variant={selectedColumns.includes(option.id) ? "default" : "outline"} onClick={() => handleColumnSelect(option.id)} size="sm">
					{option.label}
				</Button>
			))}
		</div>
	);

	const handleOpacityChange = (value: number[]) => {
		setOpacity(value[0] / 100); // Assuming the slider returns a value between 0 and 100
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			// Split shlokas by '#'
			const shlokas = shlokaInput
				.split("#")
				.map((s) => s.trim())
				.filter(Boolean);

			const processedResults = await Promise.all(
				shlokas.map(async (shloka) => {
					// Call sandhi splitter API
					const response = await fetch(
						`https://sanskrit.uohyd.ac.in/cgi-bin/scl/MT/prog/sandhi_splitter/sandhi_splitter.cgi?word=${encodeURIComponent(
							shloka
						)}&encoding=Unicode&outencoding=D&mode=sent&disp_mode=json`
					);

					const data = await response.json();
					return {
						original: shloka,
						split: data.segmentation || [],
					};
				})
			);

			setProcessedShlokas(processedResults);

			// Process analysis for each SPLIT shloka
			const analysisResults = await Promise.all(
				processedResults.map(async (result, shlokaIndex) => {
					const splitSentence = result.split.join(" ");
					console.log("Sending split sentence for analysis:", splitSentence);

					const response = await fetch(
						`https://sanskrit.uohyd.ac.in/cgi-bin/scl/MT/anusaaraka.cgi?encoding=Unicode&out_encoding=Devanagari&splitter=None&parse=FULL&tlang=Hindi&text_type=Sloka&mode=json&text=${encodeURIComponent(
							splitSentence
						)}`
					);

					const responseText = await response.text();
					console.log("Response text:", responseText);

					try {
						const data = JSON.parse(responseText);
						console.log("Parsed data for split shloka", shlokaIndex + 1, ":", data);

						// Extract the sent array from the first object
						if (data && Array.isArray(data) && data[0] && data[0].sent) {
							return data[0].sent.map((item: any) => ({
								...item,
								shlokaIndex: shlokaIndex + 1,
							}));
						}
						return [];
					} catch (parseError) {
						console.error("Error parsing analysis response:", parseError);
						console.log("Response text:", responseText);
						return [];
					}
				})
			);

			// Flatten and format all analysis data
			const formattedAnalysis = analysisResults
				.flat()
				.filter(Boolean)
				.map((item: any) => ({
					...item,
					sentno: `${item.shlokaIndex}.${item.index.split(".")[0]}`,
					anvaya_no: `${item.shlokaIndex}.${item.index}`,
					bgcolor: item.color_code || "transparent",
					poem: item.poem || "",
					morph_analysis: item.morph_analysis || "-",
					morph_in_context: item.morph_in_context || "-",
					kaaraka_sambandha: item.kaaraka_sambandha || "-",
					possible_relations: item.possible_relations || "-",
					hindi_meaning: item.hindi_meaning_active || item.hindi_meaning || "-",
					word: item.word || "-",
					sandhied_word: item.sandhied_word || "-",
				}));

			console.log("Final formatted analysis:", formattedAnalysis);

			if (formattedAnalysis.length > 0) {
				setAnalysisData(formattedAnalysis);
				toast.success("Shlokas processed successfully!");
			} else {
				toast.error("No analysis data was generated");
			}
		} catch (error) {
			console.error("Error processing shlokas:", error);
			toast.error("Error processing shlokas: " + (error as Error).message);
		} finally {
			setLoading(false);
		}
	};

	// Add this useEffect to monitor analysisData changes
	useEffect(() => {
		console.log("Analysis data updated:", analysisData);
	}, [analysisData]);

	const handleGenerateGraph = async () => {
		const selectedFields = [
			"index",
			"word",
			"poem",
			"sandhied_word",
			"morph_analysis",
			"morph_in_context",
			"kaaraka_sambandha",
			"possible_relations",
			"color_code",
		];

		// Group data by sentno
		const groupedData: { [key: string]: any[] } = {};
		analysisData.forEach((item: any) => {
			const sentno = item.sentno; // Assuming each item has a sentno property

			if (!groupedData[sentno]) {
				groupedData[sentno] = [];
			}

			// Create a new object with only the selected fields
			const filteredItem: any = {};
			selectedFields.forEach((field) => {
				filteredItem[field] = item[field];
			});

			groupedData[sentno].push(filteredItem);
		});

		// Clear previous graph URLs and errors before starting
		setGraphUrls({});
		setErrorMessage(null);

		// Generate a graph for each sentno group
		for (const [sentno, dataForSentno] of Object.entries(groupedData)) {
			try {
				// Convert the filtered data to TSV format
				const tsv = jsonToTsv(dataForSentno);

				// Submit the graph generation request for this sentno
				const imageUrl = await handleSubmitGraph(tsv);

				// Update graph URLs for this sentno
				setGraphUrls((prevGraphUrls) => ({
					...prevGraphUrls,
					[sentno]: imageUrl || "", // Ensure imageUrl is a string
				}));
			} catch (error) {
				// If any error occurs, show the error message
				setErrorMessage(`Error generating graph for sentno: ${sentno}`);
			}
		}
	};

	const handleSubmitGraph = async (tsvData: string) => {
		const formData = new FormData();
		formData.append("tsv", tsvData);

		try {
			const response = await fetch("https://sanskrit.uohyd.ac.in/cgi-bin/scl/Post-editing/ViewGraph.cgi", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error("Error uploading TSV data: " + response.statusText);
			}

			const result = await response.text();
			setErrorMessage(null);

			// Extract image URL from response
			const imageUrlMatch = result.match(/<img src="([^"]+)"/);
			if (imageUrlMatch && imageUrlMatch[1]) {
				return `https://sanskrit.uohyd.ac.in${imageUrlMatch[1]}`;
			}
		} catch (error) {
			setErrorMessage("Error uploading TSV data: " + (error as Error).message);
			return null;
		}
	};

	// Add zoom-related constants
	const MIN_ZOOM = 0.5;
	const MAX_ZOOM = 2;
	const DEFAULT_ZOOM = 1;
	const ZOOM_STEP = 0.1;

	// Add zoom-related handlers
	const handleZoomIn = (sentno: string) => {
		setZoomLevels((prev) => ({
			...prev,
			[sentno]: Math.min(MAX_ZOOM, (prev[sentno] || DEFAULT_ZOOM) + ZOOM_STEP),
		}));
	};

	const handleZoomOut = (sentno: string) => {
		setZoomLevels((prev) => ({
			...prev,
			[sentno]: Math.max(MIN_ZOOM, (prev[sentno] || DEFAULT_ZOOM) - ZOOM_STEP),
		}));
	};

	const handleResetZoom = (sentno: string) => {
		setZoomLevels((prev) => ({
			...prev,
			[sentno]: DEFAULT_ZOOM,
		}));
	};

	// Modify renderTableContent to add debugging
	const renderTableContent = () => {
		console.log("Rendering table with data:", analysisData);
		return (
			<TableBody>
				{analysisData.map((processed: any, procIndex: number) => {
					const isHovered = hoveredRowIndex === procIndex;
					const isNewShloka = procIndex === 0 || processed.shlokaIndex !== analysisData[procIndex - 1].shlokaIndex;

					return (
						<React.Fragment key={procIndex}>
							{isNewShloka && (
								<TableRow>
									<TableCell colSpan={selectedColumns.length + (permissions !== "User" ? 1 : 0)} className="bg-muted/30 font-medium">
										Shloka {processed.shlokaIndex}
									</TableCell>
								</TableRow>
							)}
							<TableRow
								onMouseEnter={() => setHoveredRowIndex(procIndex)}
								onMouseLeave={() => setHoveredRowIndex(null)}
								style={{
									backgroundColor: processed.color_code
										? `rgba(${hexToRgb(processed.color_code)}, ${isHovered ? Math.min(opacity + 0.1, 1) : opacity})`
										: "transparent",
								}}
							>
								{selectedColumns.includes("index") && <TableCell>{processed.anvaya_no}</TableCell>}
								{selectedColumns.includes("word") && <TableCell>{processed.word}</TableCell>}
								{selectedColumns.includes("poem") && <TableCell>{processed.poem}</TableCell>}
								{selectedColumns.includes("sandhied_word") && <TableCell>{processed.sandhied_word}</TableCell>}
								{selectedColumns.includes("morph_analysis") && <TableCell>{processed.morph_analysis}</TableCell>}
								{selectedColumns.includes("morph_in_context") && <TableCell>{processed.morph_in_context}</TableCell>}
								{selectedColumns.includes("kaaraka_sambandha") && <TableCell>{processed.kaaraka_sambandha}</TableCell>}
								{selectedColumns.includes("possible_relations") && <TableCell>{processed.possible_relations}</TableCell>}
								{selectedColumns.includes("hindi_meaning") && <TableCell>{processed.hindi_meaning}</TableCell>}
								{permissions !== "User" && <TableCell>{/* Add edit/save buttons here */}</TableCell>}
							</TableRow>
						</React.Fragment>
					);
				})}
			</TableBody>
		);
	};

	return (
		<div className="container mx-auto p-6 space-y-8">
			<Card>
				<CardHeader>
					<CardTitle>Add Shlokas</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block mb-2">Enter Shlokas (separate multiple shlokas with #):</label>
							<Input
								value={shlokaInput}
								onChange={(e) => setShlokaInput(e.target.value)}
								placeholder="Enter shlokas separated by #"
								className="h-24"
								multiple
							/>
						</div>
						<Button type="submit" disabled={loading}>
							{loading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Processing...
								</>
							) : (
								"Process Shlokas"
							)}
						</Button>
					</form>
				</CardContent>
			</Card>

			{/* Display processed shlokas */}
			{processedShlokas.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Processed Shlokas</CardTitle>
					</CardHeader>
					<CardContent>
						{processedShlokas.map((result, index) => (
							<div key={index} className="mb-4">
								<h3 className="font-semibold">Original Shloka {index + 1}:</h3>
								<p>{result.original}</p>
								<h4 className="mt-2">Split Result:</h4>
								<p>{result.split.join(" ")}</p>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{/* Analysis Results Card */}
			{analysisData.length > 0 && (
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle>Analysis Results</CardTitle>
						<div className="flex items-center gap-4">
							{/* Opacity Slider */}
							<Popover>
								<PopoverTrigger asChild>
									<Button variant="outline" size="sm">
										<SliderIcon className="mr-2 h-4 w-4" />
										Set Opacity
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-80">
									<div className="space-y-2">
										<h4 className="font-medium leading-none">Background Opacity</h4>
										<p className="text-sm text-muted-foreground">Adjust the opacity of color highlighting</p>
										<Slider
											defaultValue={[opacity * 100]}
											max={100}
											step={1}
											className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
											onValueChange={handleOpacityChange}
										/>
									</div>
								</PopoverContent>
							</Popover>

							{/* Column Selector */}
							<Popover>
								<PopoverTrigger asChild>
									<Button variant="outline" size="sm">
										Select Columns
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-80">
									<div className="space-y-2">
										<h4 className="font-medium leading-none mb-3">Visible Columns</h4>
										<div className="grid grid-cols-2 gap-2">
											{columnOptions.map((option) => (
												<Button
													key={option.id}
													variant={selectedColumns.includes(option.id) ? "default" : "outline"}
													onClick={() => handleColumnSelect(option.id)}
													size="sm"
												>
													{option.label}
												</Button>
											))}
										</div>
									</div>
								</PopoverContent>
							</Popover>

							{/* Generate Graph Button */}
							<Button onClick={handleGenerateGraph} size="sm" disabled={analysisData.length === 0}>
								Generate Graph
							</Button>
						</div>
					</CardHeader>

					<CardContent>
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										{selectedColumns.includes("index") && <TableHead>Index</TableHead>}
										{selectedColumns.includes("word") && <TableHead>Word</TableHead>}
										{selectedColumns.includes("poem") && <TableHead>Prose Index</TableHead>}
										{selectedColumns.includes("sandhied_word") && <TableHead>Sandhied Word</TableHead>}
										{selectedColumns.includes("morph_analysis") && <TableHead>Morph Analysis</TableHead>}
										{selectedColumns.includes("morph_in_context") && <TableHead>Morph In Context</TableHead>}
										{selectedColumns.includes("kaaraka_sambandha") && <TableHead>Kaaraka Relation</TableHead>}
										{selectedColumns.includes("possible_relations") && <TableHead>Possible Relations</TableHead>}
										{selectedColumns.includes("hindi_meaning") && <TableHead>Hindi Meaning</TableHead>}
										{permissions !== "User" && <TableHead>Actions</TableHead>}
									</TableRow>
								</TableHeader>
								{renderTableContent()}
							</Table>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Graph Display */}
			{Object.keys(graphUrls).length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Generated Graphs</CardTitle>
					</CardHeader>
					<CardContent>
						<GraphDisplay
							graphUrls={graphUrls}
							zoomLevels={zoomLevels}
							handleZoomIn={handleZoomIn}
							handleZoomOut={handleZoomOut}
							handleResetZoom={handleResetZoom}
							MIN_ZOOM={MIN_ZOOM}
							MAX_ZOOM={MAX_ZOOM}
							DEFAULT_ZOOM={DEFAULT_ZOOM}
						/>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
