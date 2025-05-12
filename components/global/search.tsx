import { useState, useRef, useEffect } from "react";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import debounce from "lodash/debounce";

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
	const searchRef = useRef<HTMLDivElement>(null);
	const router = useRouter();

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
				setShowResults(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

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

	const handleResultClick = (result: SearchResult) => {
		const path = `/books/${result.book}/${result.part1 || "null"}/${result.part2 || "null"}/${result.chaptno}/${result._id}`;
		router.push(path);
		setShowResults(false);
		setQuery("");
	};

	return (
		<div className="relative" ref={searchRef}>
			<div className="flex items-center gap-2">
				<div className="relative">
					<SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search shlokas..."
						className="pl-8 w-[300px]"
						value={query}
						onChange={(e) => handleSearch(e.target.value)}
						onFocus={() => setShowResults(true)}
					/>
				</div>
			</div>

			{showResults && (query || loading) && (
				<div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-950 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 max-h-[400px] overflow-y-auto z-50">
					{loading ? (
						<div className="flex justify-center p-4">
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
						</div>
					) : results.length === 0 ? (
						<div className="p-4 text-center text-sm text-muted-foreground">No results found</div>
					) : (
						<div className="divide-y divide-gray-200 dark:divide-gray-800">
							{results.map((result, index) => (
								<Button
									key={index}
									variant="ghost"
									className="w-full justify-start p-4 hover:bg-gray-50 dark:hover:bg-gray-900"
									onClick={() => handleResultClick(result)}
								>
									<div className="space-y-1 text-left">
										<div className="text-sm font-medium">
											{result.book} {result.part1 && `- ${result.part1}`} {result.part2 && `- ${result.part2}`} - {result.chaptno}.{result.slokano}
										</div>
										{result.spart && <p className="text-xs text-muted-foreground line-clamp-2">{result.spart}</p>}
									</div>
								</Button>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
