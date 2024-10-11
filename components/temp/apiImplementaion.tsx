"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import {  ExclamationTriangleIcon, SliderIcon } from "@radix-ui/react-icons";
import axios from "axios";
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
} from "@/components/ui/select"
import { colorMapping } from "@/lib/constants";



// Helper function to clean and combine the shloka parts
const cleanAndCombineShloka = (spart1: string, spart2?: string) => {
	const cleanPart1 = spart1.replace(/\।/g, "").trim();
	const cleanPart2 = spart2 ? spart2.replace(/\।/g, "").trim() : "";

	// Combine the two parts if spart2 exists
	return cleanPart2 ? `${cleanPart1} ${cleanPart2}` : cleanPart1;
};

export default function ShlokaPage() {
	const { id } = useParams(); // Get the shloka ID from the URL
	const [shloka, setShloka] = useState<Shloka | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sandhiSplit, setSandhiSplit] = useState<string | null>(null);
	const [processedSegments, setProcessedSegments] = useState<any[]>([]); // To store processed segments

	const [opacity, setOpacity] = useState(0.5); // Default opacity value
    const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);

	const handleOpacityChange = (value: number[]) => {
		setOpacity(value[0] / 100); // Assuming the slider returns a value between 0 and 100
	};

	// Fetch the shloka by ID
	useEffect(() => {
		async function fetchShloka() {
			try {
				const response = await fetch(`/api/ahShloka/${id}`);
				const data = await response.json();
				setShloka(data);
			} catch (error) {
				console.error("Error fetching shloka:", error);
				setLoading(false);
			}
		}

		if (id) {
			fetchShloka();
		}
	}, [id]);

	// Function to process segments with the second API
	const processSegments = async (segments: string[]) => {
		try {
			const processedSegments: any[] = await Promise.all(
				segments.map(async (segment) => {
					const response = await axios.get(
						`https://sanskrit.uohyd.ac.in/cgi-bin/scl/MT/anusaaraka.cgi`, // Second API URL
						{
							params: {
								encoding: "Unicode",
								out_encoding: "Devanagari",
								splitter: "None",
								parse: "FULL",
								tlang: "Hindi",
								text_type: "Sloka",
								mode: "json",
								text: segment, // The segment from the first API
							},
						}
					);
					setLoading(false);
					return response.data[0].sent; // Return the full processed segment object
				})
			);
			return processedSegments.flat(); // Flatten the array of arrays
		} catch (err) {
			setLoading(false);
			console.error("Error in second API call:", err);
			return [{ word: "Error in processing" }];
		}
	};

	// Function to fetch segmentation and process the combined shloka
	const fetchSandhiSplit = async (combinedShloka: string) => {
		try {
			// Call the Sandhi splitter API with the combined shloka
			const response = await axios.get(
				`https://sanskrit.uohyd.ac.in/cgi-bin/scl/MT/prog/sandhi_splitter/sandhi_splitter.cgi`,
				{
					params: {
						word: combinedShloka,
						encoding: "Unicode",
						outencoding: "D",
						mode: "sent",
						disp_mode: "json",
					},
				}
			);

			// Extract the segments from the response (sandhi split)
			const segments = response.data?.segmentation || [
				"No segmentation available",
			];

			// Process each segment using the second API
			const processedSegments = await processSegments(segments);
			setProcessedSegments(processedSegments); // Update the state with processed segments

			// Combine the segments into a string
			setSandhiSplit(segments.join(" "));
		} catch (err) {
			setLoading(false);
			setError("Failed to fetch segmentation or process data.");
			console.error(err);
		}
	};

	// When the shloka data is fetched and available, clean and combine it
	useEffect(() => {
		if (shloka) {
			// Clean and combine the shloka parts
			const combinedShloka = cleanAndCombineShloka(
				shloka.spart1,
				shloka.spart2
			);

			// Fetch sandhi split for the combined shloka
			fetchSandhiSplit(combinedShloka);
		}
	}, [shloka]);

    const [selectedKS, setSelectedKSs] = useState<
		{ [key: number]: string }
	>({}); // To store selected relations by index

	const handleKSChange = (index: number, value: string) => {
		setSelectedKSs((prev) => ({ ...prev, [index]: value }));
        console.log(selectedKS);
	};
    
    const [selectedMC, setSelectedMCs] = useState<
		{ [key: number]: string }
	>({}); // To store selected relations by index

	const handleMCChange = (index: number, value: string) => {
		setSelectedMCs((prev) => ({ ...prev, [index]: value }));
	};

	// If loading, show the loader
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

	// If there's an error or shloka not found
	if (!shloka) {
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

	// Return the UI with the Shloka
	return (
		<div className="p-8">
			<Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col justify-between duration-300">
				<CardHeader className="border-b border-primary-100">
					<CardTitle>
						Chapter {shloka.chaptno} - Shloka {shloka.slokano}
					</CardTitle>
				</CardHeader>
				<CardContent className="p-10">
                    <div className="">
                        {/* Original Shloka */}
                        <div>
                        <h3 className="text-lg font-bold mb-4">Original Shloka:</h3>
                        <div className="text-sm flex flex-col gap-2">
                            <p>{shloka.spart1}</p>
                            <p>{shloka.spart2 ? shloka.spart2 : ""}</p>
                        </div>
                        </div>
                        <div>
                        <h3 className="text-lg font-bold mb-4 mt-8">
                            Sandhi-Split Shloka:
                        </h3>
                        <p className="text-sm">
                            {sandhiSplit
                                ? sandhiSplit
                                : "Sandhi split not available yet."}
                        </p>
                        </div>
                    </div>

					{/* Processed Segments Table */}
					<h3 className="text-lg font-bold mb-4 mt-8">
						Processed Segments:
					</h3>
                    <div className=" w-full flex justify-end">
                    <Popover>
						<PopoverTrigger asChild>
							<Button variant="outline"> <SliderIcon /></Button> 
						</PopoverTrigger>
						<PopoverContent className="w-80">
							<div className="space-y-4">
								<h4 className="font-medium leading-none">
									Adjust Opacity
								</h4>
								<Slider
									defaultValue={[opacity * 100]} // Convert to percentage for the slider
									max={100}
									step={1}
									onValueChange={handleOpacityChange} // Change this to onValueChange
								/>
								<div className="flex justify-between items-center">
									<span className="text-sm text-muted-foreground">
										Current value:
									</span>
									<span className="font-medium">
										{Math.round(opacity * 100)}
									</span>{" "}
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
								<TableHead>Morph in Context</TableHead>
								<TableHead>Kaaraka Sambandha</TableHead>
								<TableHead>Possible Relations</TableHead>
								<TableHead>Hindi Meaning Active</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
                                {processedSegments.length > 0 ? (
                                processedSegments.map((processed, procIndex) => (
										<TableRow
											key={procIndex}
											onMouseEnter={() => setHoveredRowIndex(procIndex)} // Use the index of the current row
                                            onMouseLeave={() => setHoveredRowIndex(null)}
                                            style={{
                                                backgroundColor: colorMapping[processed.color_code]
                                                    ? `${colorMapping[processed.color_code].replace(/rgba?\((\d+), (\d+), (\d+),?\s*[\d.]*\)?/, `rgba($1, $2, $3, ${hoveredRowIndex === procIndex ? Math.min(opacity + 0.1, 1) : opacity})`)}`
                                                    : 'transparent',
                                            }}
										>
											<TableCell>
												{processed.index}
											</TableCell>
											<TableCell>
												{processed.word}
											</TableCell>
											<TableCell>
												{processed.morph_analysis}
											</TableCell>
											<TableCell>
                                            <Select
                                                    value={selectedMC[processed.index] || processed.morph_in_context || "error"} // Use the selected relation or the default value
                                                    onValueChange={(value) => handleMCChange(processed.index, value)} // Use onValueChange 
                                                    >
                                                    <SelectTrigger className="w-[180px]">
                                                        <SelectValue placeholder="Select relation" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {processed.morph_analysis.split("/").map((relation:any, index:any) => (
                                                            <SelectItem key={index} value={relation}>
                                                                {relation}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
											</TableCell>
											<TableCell>
                                                <Select
                                                    value={selectedKS[processed.index] || processed.kaaraka_sambandha} // Use the selected relation or the default value
                                                    onValueChange={(value) => handleKSChange(processed.index, value)} // Use onValueChange 
                                                    >
                                                    <SelectTrigger className="w-[180px]">
                                                        <SelectValue placeholder="Select relation" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {processed.possible_relations.split("#").map((relation:any, index:any) => (
                                                            <SelectItem key={index} value={relation}>
                                                                {relation}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
											<TableCell>
												{processed.possible_relations}
											</TableCell>
											<TableCell>
												{processed.hindi_meaning_active}
											</TableCell>
										</TableRow>
									))
                                ) : (
								<TableRow>
									<TableCell
										colSpan={7}
										className="text-center"
									>
										No processed segments available.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
