"use client";

import { useState, useEffect } from "react";

import { Card, CardContent } from "@/components/ui/card";

import {  SliderIcon } from "@radix-ui/react-icons";
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
import { colorMapping } from "@/lib/constants";
import { Input } from "../ui/input";



// Helper function to clean and combine the shloka parts
const cleanAndCombineShloka = (spart1: string, spart2?: string) => {
	const cleanPart1 = spart1.replace(/\।/g, "").trim();
	const cleanPart2 = spart2 ? spart2.replace(/\।/g, "").trim() : "";

	// Combine the two parts if spart2 exists
	return cleanPart2 ? `${cleanPart1} ${cleanPart2}` : cleanPart1;
};

export default function ShlokaPage() {
    const [shlokaPart1, setShlokaPart1] = useState<string>("");
	const [shlokaPart2, setShlokaPart2] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sandhiSplit, setSandhiSplit] = useState<string | null>(null);
	const [processedSegments, setProcessedSegments] = useState<any[]>([]); // To store processed segments
	const [combinedShloka, setCombinedShloka] = useState<string>("");
	const [opacity, setOpacity] = useState(0.5); // Default opacity value
    const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);

	const handleOpacityChange = (value: number[]) => {
		setOpacity(value[0] / 100); // Assuming the slider returns a value between 0 and 100
	};


	// Function to process segments with the second API
	const processSegments = async (segments: string[]) => {
        setLoading(true);
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
            setLoading(false);
			return processedSegments.flat(); 
            // Flatten the array of arrays
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
			setError("Failed to fetch segmentation or process data.");
			console.error(err);
		}
	};



    const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		// Combine the shloka parts
		const combined = cleanAndCombineShloka(shlokaPart1, shlokaPart2);
		setCombinedShloka(combined); // Update the combined shloka in the state

		// Fetch and process the combined shloka
		fetchSandhiSplit(combined); // Updated to fetch sandhi split
	};


	// Return the UI with the Shloka
	return (
		<div className="p-8">
			<Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col justify-between duration-300">
            <CardContent className="p-10">
					<form onSubmit={handleSubmit}>
						<div className="mb-4">
							<label htmlFor="shlokaPart1" className="block mb-2">
								Enter Shloka Part 1:
							</label>
							<Input
								id="shlokaPart1"
								value={shlokaPart1}
								onChange={(e) => setShlokaPart1(e.target.value)}
								placeholder="Enter first part of the shloka"
							/>
						</div>
						<div className="mb-4">
							<label htmlFor="shlokaPart2" className="block mb-2">
								Enter Shloka Part 2 (optional):
							</label>
							<Input
								id="shlokaPart2"
								value={shlokaPart2}
								onChange={(e) => setShlokaPart2(e.target.value)}
								placeholder="Enter second part of the shloka (optional)"
							/>
						</div>
						<button
							type="submit"
							className="bg-blue-500 text-white px-4 py-2 rounded"
						>
							Combine and Process Shloka
						</button>
					</form>

					{combinedShloka && (
						<div className="mt-6">
							<h3 className="font-semibold">Combined Shloka:</h3>
							<p>{combinedShloka}</p>
						</div>
					)}

					{loading && <p>Processing...</p>}

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
								processedSegments.map((processed: { color_code: keyof typeof colorMapping, index: number, word: string, morph_analysis: string, morph_in_context: string, kaaraka_sambandha: string, possible_relations: string, hindi_meaning_active: string }, procIndex) => (
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
                                                {processed.morph_in_context}
											</TableCell>
											<TableCell>
                                                {processed.kaaraka_sambandha}
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
