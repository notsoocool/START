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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { validKaarakaSambandhaValues } from "@/lib/constants";

export default function ShlokaPage() {
	const { id } = useParams(); // Get the shloka ID from the URL
	const [shloka, setShloka] = useState<Shloka | null>(null);
	const [loading, setLoading] = useState(true);
	const [chapter, setChapter] = useState<any>(null);
	const [opacity, setOpacity] = useState(0.5); // Default opacity value
	const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
	const [updatedData, setUpdatedData] = useState<any[]>([]);
	const [tsvData, setTsvData] = useState<string | null>(null);
    const [changedRows, setChangedRows] = useState<Set<number>>(new Set()); // Track which rows have changed
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [graphUrls, setGraphUrls] = useState<{ [sentno: string]: string }>(
		{}
	);

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

    const handleValueChange = (index: number, field: string, value: any) => {
        const newData = [...updatedData];
        newData[index] = {
            ...newData[index],
            [field]: value,
        };
        setUpdatedData(newData);
    
        // Get the original value for comparison
        const originalValue = chapter.data[index][field];
    
        // Always track if the current value is different from the last saved value
        if (value !== originalValue) {
            setChangedRows((prev) => new Set(prev).add(index)); // Add index if value changed
        } else {
            setChangedRows((prev) => {
                const newSet = new Set(prev);
                newSet.delete(index); // Remove index if value is the same as original
                return newSet;
            });
        }
    };
    
    // Updated handleSave function
    const handleSave = async (index: number, anvaya_no: any) => {
        try {
            const updatedValue = updatedData[index]; // Get the updated value for the specific index
            const previousValue = chapter.data[index]?.kaaraka_sambandha; // Retrieve the previous value
            const newKaarakaValue = updatedValue.kaaraka_sambandha;
    
            if (newKaarakaValue !== previousValue) {
                const extractedValue = newKaarakaValue.split(',')[0].trim(); // Extract only the first part before the comma
    
                if (!validKaarakaSambandhaValues.includes(extractedValue)) {
                    toast.error("Kaaraka Sambandha does not exist in valid strings.");
                    return; // Stop further execution if validation fails
                }
            } // Get the updated value for the specific index
    
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
    
            // Clear changedRows after successful save
            setChangedRows((prev) => {
                const newSet = new Set(prev);
                newSet.delete(index); // Remove the current index after save
                return newSet;
            });
    
            // Update the chapter state with the latest saved values
            const newChapterData = [...chapter.data];
            newChapterData[index] = updatedValue; // Update the saved value in the chapter data
            setChapter({ ...chapter, data: newChapterData });
    
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
			"anvaya_no",
			"word",
			"poem",
			"sandhied_word",
			"morph_analysis",
			"morph_in_context",
			"kaaraka_sambandha",
			"possible_relations",
            "bgcolor"
		];

		// Group data by sentno
		const groupedData: { [key: string]: any[] } = {};

		chapter.data.forEach((item: any, index: number) => {
			const updatedItem = updatedData[index] || {};
			const sentno = updatedItem.sentno ?? item.sentno;

			if (!groupedData[sentno]) {
				groupedData[sentno] = [];
			}

			// Create a new object with only the selected fields
			const filteredItem: any = {};
			selectedFields.forEach((field) => {
				filteredItem[field] = updatedItem[field] ?? item[field];
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
				return `https://sanskrit.uohyd.ac.in${imageUrlMatch[1]}`;
			}
		} catch (error) {
			setErrorMessage(
				"Error uploading TSV data: " + (error as Error).message
			);
			return null;
		}
	};

    const [selectedColumns, setSelectedColumns] = useState<string[]>([
        'index',
        'word',
        'morph_analysis',
        'morph_in_context',
        'kaaraka_sambandha',
        'possible_relations',
      ]);
    
      // Toggle column visibility
      const handleColumnSelect = (column: string) => {
        setSelectedColumns((prevSelected) =>
          prevSelected.includes(column)
            ? prevSelected.filter((item) => item !== column)
            : [...prevSelected, column]
        );
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
					
					<div className=" w-full flex justify-between">
                        <h3 className="text-lg font-bold mb-4 mt-8">
                            Processed Segments:
                        </h3>
                        <div className="flex gap-5">
                            <div className=" pt-8">
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
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <Button variant="outline" className="mt-8">
                                    Show/Hide Columns
                                </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="sm:max-w-[425px]">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Columns</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Choose the columns you want to show or hide.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="index"
                                        checked={selectedColumns.includes('index')}
                                        onCheckedChange={() => handleColumnSelect('index')}
                                    />
                                    <Label htmlFor="index">Index</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="word"
                                        checked={selectedColumns.includes('word')}
                                        onCheckedChange={() => handleColumnSelect('word')}
                                    />
                                    <Label htmlFor="word">Word</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="morphAnalysis"
                                        checked={selectedColumns.includes('morph_analysis')}
                                        onCheckedChange={() => handleColumnSelect('morph_analysis')}
                                    />
                                    <Label htmlFor="morphAnalysis">Morph Analysis</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="morphInContext"
                                        checked={selectedColumns.includes('morph_in_context')}
                                        onCheckedChange={() => handleColumnSelect('morph_in_context')}
                                    />
                                    <Label htmlFor="morphInContext">Morph In Context</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="kaarakaSambandha"
                                        checked={selectedColumns.includes('kaaraka_sambandha')}
                                        onCheckedChange={() => handleColumnSelect('kaaraka_sambandha')}
                                    />
                                    <Label htmlFor="kaarakaSambandha">Kaaraka Relation</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="possibleRelations"
                                        checked={selectedColumns.includes('possible_relations')}
                                        onCheckedChange={() => handleColumnSelect('possible_relations')}
                                    />
                                    <Label htmlFor="possibleRelations">Possible Relations</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="hindiMeaning"
                                        checked={selectedColumns.includes('hindi_meaning')}
                                        onCheckedChange={() => handleColumnSelect('hindi_meaning')}
                                    />
                                    <Label htmlFor="hindiMeaning">Hindi Meaning</Label>
                                    </div>
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction>Save</AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
					</div>

					<div>
                        <Table>
                            <TableHeader>
                            <TableRow>
                                {selectedColumns.includes('index') && <TableHead>Index</TableHead>}
                                {selectedColumns.includes('word') && <TableHead>Word</TableHead>}
                                {selectedColumns.includes('morph_analysis') && (
                                <TableHead>Morph Analysis</TableHead>
                                )}
                                {selectedColumns.includes('morph_in_context') && (
                                <TableHead>Morph In Context</TableHead>
                                )}
                                {selectedColumns.includes('kaaraka_sambandha') && (
                                <TableHead>Kaaraka Sambandha</TableHead>
                                )}
                                {selectedColumns.includes('possible_relations') && (
                                <TableHead>Possible Relations</TableHead>
                                )}
                                {selectedColumns.includes('hindi_meaning') && (
                                <TableHead>Hindi Meaning</TableHead>
                                )}
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
                                                                        backgroundColor: `${processed.bgcolor}${Math.round(
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
                                    {selectedColumns.includes('index') && (
                                        <TableCell>{processed.anvaya_no}</TableCell>
                                    )}
                                    {selectedColumns.includes('word') && (
                                        <TableCell>{processed.word}</TableCell>
                                    )}
                                    {selectedColumns.includes('morph_analysis') && (
                                        <TableCell>{processed.morph_analysis}</TableCell>
                                    )}
                                    {selectedColumns.includes('morph_in_context') && (
                                        <TableCell>
                                        <Select
                                            value={currentProcessedData?.morph_in_context}
                                            onValueChange={(value) =>
                                                handleValueChange(procIndex, 'morph_in_context', value)
                                            }
                                        >
                                            <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder={processed.morph_analysis} />
                                            </SelectTrigger>
                                            <SelectContent>
                                            {processed.morph_analysis
                                                .split('/')
                                                .map((morph: string, index: number) => (
                                                <SelectItem key={index} value={morph.trim()}>
                                                    {morph.trim()}
                                                </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        </TableCell>
                                    )}
                                    {selectedColumns.includes('kaaraka_sambandha') && (
                                       <TableCell>
                                       <Input
                                           type="text"
                                           value={currentProcessedData?.kaaraka_sambandha || ''}
                                           onChange={(e) =>
                                               handleValueChange(procIndex, 'kaaraka_sambandha', e.target.value)
                                           }
                                           className="w-[180px] p-2 border rounded"
                                           placeholder="Enter Kaaraka Sambandha"
                                       />
                                   </TableCell>
                                   
                                    )}
                                    {selectedColumns.includes('possible_relations') && (
                                        <TableCell>{processed.possible_relations}</TableCell>
                                    )}
                                    {selectedColumns.includes('hindi_meaning') && (
                                        <TableCell>{processed.hindi_meaning}</TableCell>
                                    )}
                                    <TableCell>
                                    {changedRows.has(procIndex) && (
                                   
                                        <Button
                                            onClick={() => handleSave(procIndex, processed.anvaya_no)}
                                            className="w-full"
                                        >
                                            Save
                                        </Button>
                                   
                                )}
                                    </TableCell>
                                    </TableRow>
                                );
                                })
                            ) : (
                                <TableRow>
                                <TableCell colSpan={7} className="text-center">
                                    No data available
                                </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
					<Button onClick={handleGenerateGraph} className="mb-4">
						Generate Graph
					</Button>
					{Object.entries(graphUrls).map(([sentno, imageUrl]) => (
						<div key={sentno} className="mb-4">
							<h3>Graph for sentno: {sentno}</h3>
							<img
								src={imageUrl}
								alt={`Generated Graph for sentno ${sentno}`}
							/>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
