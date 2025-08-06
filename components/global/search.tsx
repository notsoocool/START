import { useState, useRef, useEffect, useCallback } from "react";
import { Search as SearchIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import debounce from "lodash/debounce";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SearchResult {
	_id: string;
	book: string;
	part1?: string;
	part2?: string;
	chaptno: string;
	slokano: string;
	spart?: string;
}

export function Search() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [showResults, setShowResults] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [animating, setAnimating] = useState(false);
	const searchRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const newDataRef = useRef<any[]>([]);
	const router = useRouter();

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
				setShowResults(false);
				if (!isExpanded) {
					setIsExpanded(false);
				}
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isExpanded]);

	const debouncedSearch = debounce(async (searchQuery: string) => {
		if (!searchQuery.trim()) {
			setResults([]);
			setLoading(false);
			return;
		}

		try {
			const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
			const data = await response.json();
			setResults(data);
		} catch (error) {
			console.error("Search error:", error);
			setResults([]);
		} finally {
			setLoading(false);
		}
	}, 300);

	const handleSearch = (value: string) => {
		setQuery(value);
		setLoading(true);
		setShowResults(true);
		debouncedSearch(value);
	};

	const handleSearchToggle = () => {
		setIsExpanded(!isExpanded);
		if (!isExpanded) {
			setQuery("");
			setResults([]);
		}
	};

	const handleSearchClose = () => {
		setIsExpanded(false);
		setQuery("");
		setResults([]);
		setShowResults(false);
	};

	// Vanishing animation functions
	const draw = useCallback(() => {
		if (!inputRef.current) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		canvas.width = 800;
		canvas.height = 800;
		ctx.clearRect(0, 0, 800, 800);
		const computedStyles = getComputedStyle(inputRef.current);

		const fontSize = parseFloat(computedStyles.getPropertyValue("font-size"));
		ctx.font = `${fontSize * 2}px ${computedStyles.fontFamily}`;
		ctx.fillStyle = "#FFF";
		ctx.fillText(query, 16, 40);

		const imageData = ctx.getImageData(0, 0, 800, 800);
		const pixelData = imageData.data;
		const newData: any[] = [];

		for (let t = 0; t < 800; t++) {
			let i = 4 * t * 800;
			for (let n = 0; n < 800; n++) {
				let e = i + 4 * n;
				if (pixelData[e] !== 0 && pixelData[e + 1] !== 0 && pixelData[e + 2] !== 0) {
					newData.push({
						x: n,
						y: t,
						color: [pixelData[e], pixelData[e + 1], pixelData[e + 2], pixelData[e + 3]],
					});
				}
			}
		}

		newDataRef.current = newData.map(({ x, y, color }) => ({
			x,
			y,
			r: 1,
			color: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`,
		}));
	}, [query]);

	useEffect(() => {
		draw();
	}, [query, draw]);

	const animate = (start: number) => {
		const animateFrame = (pos: number = 0) => {
			requestAnimationFrame(() => {
				const newArr = [];
				for (let i = 0; i < newDataRef.current.length; i++) {
					const current = newDataRef.current[i];
					if (current.x < pos) {
						newArr.push(current);
					} else {
						if (current.r <= 0) {
							current.r = 0;
							continue;
						}
						current.x += Math.random() > 0.5 ? 1 : -1;
						current.y += Math.random() > 0.5 ? 1 : -1;
						current.r -= 0.05 * Math.random();
						newArr.push(current);
					}
				}
				newDataRef.current = newArr;
				const ctx = canvasRef.current?.getContext("2d");
				if (ctx) {
					ctx.clearRect(pos, 0, 800, 800);
					newDataRef.current.forEach((t) => {
						const { x: n, y: i, r: s, color: color } = t;
						if (n > pos) {
							ctx.beginPath();
							ctx.rect(n, i, s, s);
							ctx.fillStyle = color;
							ctx.strokeStyle = color;
							ctx.stroke();
						}
					});
				}
				if (newDataRef.current.length > 0) {
					animateFrame(pos - 8);
				} else {
					setQuery("");
					setAnimating(false);
					handleSearchClose();
				}
			});
		};
		animateFrame(start);
	};

	const vanishAndSubmit = () => {
		setAnimating(true);
		draw();

		if (query && inputRef.current) {
			const maxX = newDataRef.current.reduce((prev, current) => (current.x > prev ? current.x : prev), 0);
			animate(maxX);
		}
	};

	const handleCloseButton = () => {
		if (query) {
			// If there's text, do vanishing effect then close
			vanishAndSubmit();
		} else {
			// If no text, directly close
			handleSearchClose();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !animating) {
			vanishAndSubmit();
		}
	};

	return (
		<div className="relative" ref={searchRef}>
			<AnimatePresence mode="wait">
				{isExpanded ? (
					<motion.div
						key="search-expanded"
						initial={{
							opacity: 0,
							scale: 0.8,
							width: "40px",
						}}
						animate={{
							opacity: 1,
							scale: 1,
							width: "280px",
						}}
						exit={{
							opacity: 0,
							scale: 0.8,
							width: "40px",
						}}
						transition={{
							duration: 0.4,
							ease: [0.68, -0.55, 0.265, 1.55],
						}}
						className="relative"
					>
						<div className="relative">
							<div
								className={cn(
									"relative bg-white dark:bg-gray-900 h-10 rounded-full overflow-hidden shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),_0px_1px_0px_0px_rgba(25,28,33,0.02),_0px_0px_0px_1px_rgba(25,28,33,0.08)] transition duration-200",
									query && "bg-gray-50 dark:bg-gray-800"
								)}
							>
								<canvas
									className={cn(
										"absolute pointer-events-none text-base transform scale-50 top-[20%] left-2 origin-top-left filter invert dark:invert-0 pr-20",
										!animating ? "opacity-0" : "opacity-100"
									)}
									ref={canvasRef}
								/>
								<input
									onChange={(e) => {
										if (!animating) {
											setQuery(e.target.value);
											handleSearch(e.target.value);
										}
									}}
									onKeyDown={handleKeyDown}
									ref={inputRef}
									value={query}
									type="text"
									className={cn(
										"w-full relative text-sm z-10 border-none dark:text-white bg-transparent text-black h-full rounded-full focus:outline-none focus:ring-0 pl-4 pr-16",
										animating && "text-transparent dark:text-transparent"
									)}
									placeholder="Search for books, shlokas, discussions..."
									autoFocus
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={handleCloseButton}
									className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full flex items-center justify-center z-30 cursor-pointer pointer-events-auto"
								>
									<X className="h-4 w-4" />
								</Button>
							</div>

							{showResults && (query || loading) && (
								<motion.div
									initial={{ opacity: 0, y: -10, scale: 0.95 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									exit={{ opacity: 0, y: -10, scale: 0.95 }}
									transition={{ duration: 0.2, delay: 0.1 }}
									className="absolute top-full mt-2 w-full bg-white dark:bg-gray-950 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 max-h-[300px] overflow-y-auto z-50"
								>
									{loading ? (
										<div className="flex justify-center p-4">
											<Loader2 className="h-6 w-6 animate-spin text-primary" />
										</div>
									) : results.length === 0 ? (
										<div className="p-4 text-center text-sm text-muted-foreground">No results found</div>
									) : (
										<div className="divide-y divide-gray-200 dark:divide-gray-800">
											{results.map((result, index) => (
												<motion.div
													key={index}
													initial={{ opacity: 0, x: -10 }}
													animate={{ opacity: 1, x: 0 }}
													transition={{ delay: index * 0.03 }}
													className="p-3 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
													onClick={() => {
														const path = `/books/${result.book}/${result.part1 || "null"}/${result.part2 || "null"}/${result.chaptno}/${result._id}`;
														router.push(path);
														setShowResults(false);
														setQuery("");
														setIsExpanded(false);
													}}
												>
													<div className="space-y-1">
														<div className="text-sm font-medium">
															{result.book} {result.part1 && `- ${result.part1}`} {result.part2 && `- ${result.part2}`} - {result.chaptno}.{result.slokano}
														</div>
														{result.spart && <p className="text-xs text-muted-foreground line-clamp-2">{result.spart}</p>}
													</div>
												</motion.div>
											))}
										</div>
									)}
								</motion.div>
							)}
						</div>
					</motion.div>
				) : (
					<motion.div
						key="search-collapsed"
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.8 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
					>
						<Button
							variant="ghost"
							size="icon"
							onClick={handleSearchToggle}
							className="h-10 w-10 rounded-full bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 transition-all duration-300"
						>
							<SearchIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
						</Button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
