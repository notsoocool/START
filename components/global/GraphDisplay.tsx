"use client";

import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MinusIcon, PlusIcon } from "lucide-react";

interface GraphDisplayProps {
	graphUrls: { [sentno: string]: string };
	zoomLevels: { [key: string]: number };
	handleZoomIn: (sentno: string) => void;
	handleZoomOut: (sentno: string) => void;
	handleResetZoom: (sentno: string) => void;
	MIN_ZOOM: number;
	MAX_ZOOM: number;
	DEFAULT_ZOOM: number;
}

export function GraphDisplay({ graphUrls, zoomLevels, handleZoomIn, handleZoomOut, handleResetZoom, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM }: GraphDisplayProps) {
	const svgContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

	if (Object.keys(graphUrls).length === 0) {
		return null;
	}

	return (
		<div className="space-y-6" data-graphs-section>
			<h2 className="text-xl font-semibold">Generated Graphs</h2>
			<div className="grid gap-6">
				{Object.entries(graphUrls).map(([sentno, svgContent]) => (
					<Card key={sentno} className="overflow-hidden">
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle>Sentence {sentno}</CardTitle>
							<div className="flex items-center gap-2">
								<div className="flex items-center bg-muted rounded-md">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleZoomOut(sentno)}
										className="h-8 w-8 p-0"
										disabled={(zoomLevels[sentno] || DEFAULT_ZOOM) <= MIN_ZOOM}
									>
										<MinusIcon className="h-4 w-4" />
									</Button>
									<div className="w-14 text-center text-sm">{Math.round((zoomLevels[sentno] || DEFAULT_ZOOM) * 100)}%</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleZoomIn(sentno)}
										className="h-8 w-8 p-0"
										disabled={(zoomLevels[sentno] || DEFAULT_ZOOM) >= MAX_ZOOM}
									>
										<PlusIcon className="h-4 w-4" />
									</Button>
								</div>
								<Button variant="outline" size="sm" onClick={() => handleResetZoom(sentno)} className="h-8 px-2">
									Reset
								</Button>
							</div>
						</CardHeader>
						<CardContent className="p-0">
							<div className="relative w-full">
								<div
									ref={(el: HTMLDivElement | null) => {
										if (el) svgContainerRefs.current[sentno] = el;
									}}
									className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 
                    dark:scrollbar-thumb-gray-700 scrollbar-track-transparent 
                    hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-600 
                    pb-4"
									style={{
										maxHeight: "70vh",
										WebkitOverflowScrolling: "touch",
									}}
								>
									<div
										style={{
											transform: `scale(${zoomLevels[sentno] || DEFAULT_ZOOM})`,
											transformOrigin: "top left",
											transition: "transform 0.2s ease-in-out",
										}}
										dangerouslySetInnerHTML={{ __html: svgContent }}
									/>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
