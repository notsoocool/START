"use client";

import Link from "next/link";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export type Shloka = {
	_id: string;
	chaptno: string;
	slokano: string;
	spart: string;
};

type ChapterShlokaCardsProps = {
	shlokas: Shloka[];
	book: string;
	part1: string;
	part2: string;
	shlokasRef: React.Ref<HTMLDivElement>;
	shlokaRefs: React.MutableRefObject<{ [key: string]: HTMLElement | null }>;
};

export function ChapterShlokaCards({
	shlokas,
	book,
	part1,
	part2,
	shlokasRef,
	shlokaRefs,
}: ChapterShlokaCardsProps) {
	return (
		<div className="grid grid-cols-1 gap-6" ref={shlokasRef}>
			{shlokas.map((shloka) => (
				<Link
					href={`/books/${book}/${part1}/${part2}/${shloka.chaptno}/${shloka._id}`}
					key={shloka._id}
					data-navigate="true"
				>
					<Card
						id={shloka._id}
						ref={(el) => {
							shlokaRefs.current[shloka._id] = el;
						}}
						className="group overflow-hidden border border-gray-200 bg-white/80 transition-all duration-500 hover:border-purple-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/80 dark:hover:border-purple-700"
					>
						<CardHeader className="border-b border-gray-200 bg-gray-50/90 dark:border-gray-800 dark:bg-gray-800/90">
							<CardTitle className="flex justify-between text-base text-gray-900 dark:text-gray-100 sm:text-lg">
								Chapter {shloka.chaptno} - Shloka {shloka.slokano}
							</CardTitle>
						</CardHeader>
						<CardContent className="p-5 sm:p-6 md:p-8 transition-colors duration-300 group-hover:bg-purple-50/80 dark:group-hover:bg-purple-950/20">
							<div className="space-y-3 text-center sm:space-y-4">
								{shloka.spart.split("#").map((part, index) => (
									<p
										key={index}
										className="text-base font-medium leading-relaxed text-gray-800 dark:text-gray-200 sm:text-lg"
									>
										{part.trim()}
									</p>
								))}
							</div>
						</CardContent>
						<CardFooter className="flex justify-end px-4 py-2 text-xs text-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:text-purple-400 sm:text-sm">
							View Analysis →
						</CardFooter>
					</Card>
				</Link>
			))}
		</div>
	);
}
