"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Settings } from "lucide-react";
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

            <div className="flex flex-wrap items-center gap-4">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[200px] justify-center sm:w-auto">
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="end">
                        <Tabs defaultValue="display" className="w-full">
                            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
                                <TabsTrigger value="display" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2.5 data-[state=active]:shadow-none">
                                    Display
                                </TabsTrigger>
                                <TabsTrigger value="resources" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2.5 data-[state=active]:shadow-none">
                                    Resources
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="display" className="p-4 space-y-4 m-0">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Columns</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                        {columnOptions.map((column) => (
                                            <div key={column.id} className="flex items-center gap-2">
                                                <Checkbox id={column.id} checked={selectedColumns.includes(column.id)} onCheckedChange={() => handleColumnSelect(column.id)} />
                                                <Label htmlFor={column.id} className="text-sm font-normal cursor-pointer">{column.label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Color opacity</p>
                                    <Slider defaultValue={[50]} max={100} step={1} className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4" onValueChange={handleOpacityChange} />
                                </div>
                            </TabsContent>
                            <TabsContent value="resources" className="p-4 space-y-4 m-0">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Dictionary</p>
                                    <Select value={selectedDictionary} onValueChange={setSelectedDictionary}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Apte's Skt-Hnd Dict">Apte Sanskrit-Hindi</SelectItem>
                                            <SelectItem value="Monier Williams' Skt-Eng Dict">Monier Williams Sanskrit-English</SelectItem>
                                            <SelectItem value="Heritage Skt-French Dict">Heritage Sanskrit-French</SelectItem>
                                            <SelectItem value="Cappeller's Skt-Ger Dict">Cappeller Sanskrit-German</SelectItem>
                                            {book === "अष्टाङ्गहृदयम्" && (
                                                <SelectItem value="Ayurveda (NIIMH)">
                                                    Ayurveda Dictionary (NIIMH, Ashtanga only)
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Tagging guidelines</p>
                                    <div className="flex flex-col gap-1.5">
                                        <a
                                            href="https://sanskrit.uohyd.ac.in/scl/GOLD_DATA/Tagging_Guidelines/Dependency_Tagset_Dec_2024.pdf"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline py-0.5"
                                        >
                                            <ExternalLink className="h-3 w-3 shrink-0" />
                                            Kāraka Tagging
                                        </a>
                                        <a
                                            href="https://sanskrit.uohyd.ac.in/scl/GOLD_DATA/Tagging_Guidelines/samaasa_tagging16mar12-modified.pdf"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline py-0.5"
                                        >
                                            <ExternalLink className="h-3 w-3 shrink-0" />
                                            Samāsa Tagging
                                        </a>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </PopoverContent>
                </Popover>

                <Button onClick={handleGenerateGraph} className="w-[200px] justify-center sm:w-auto">
                    Generate Graph
                </Button>
            </div>
        </div>
    );
}
