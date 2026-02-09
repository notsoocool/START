import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChapterLoading() {
	return (
		<div className="flex min-h-screen flex-col bg-gradient-to-b from-white/80 to-slate-50/80 dark:from-gray-900/80 dark:to-gray-900/80">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:py-10">
				{/* Sidebar skeleton */}
				<div className="hidden w-full md:block md:w-3/12">
					<div className="flex flex-col items-start gap-3 rounded-lg bg-background/60 p-3 shadow-sm ring-1 ring-border/60 md:sticky md:top-24 md:max-h-[70vh] md:overflow-hidden">
						<Skeleton className="h-6 w-20" />
						<div className="mt-1 flex w-full flex-1 flex-col gap-2">
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-full" />
						</div>
					</div>
				</div>

				{/* Content skeleton - cards */}
				<div className="w-full px-1 pt-2 md:w-9/12 md:px-2 md:pt-0">
					<div className="grid grid-cols-1 gap-6">
						{[1, 2, 3].map((i) => (
							<Card key={i} className="overflow-hidden border border-border/80">
								<CardHeader className="border-b border-border/80">
									<Skeleton className="h-6 w-48" />
								</CardHeader>
								<CardContent className="p-6">
									<div className="space-y-3">
										<Skeleton className="h-5 w-full" />
										<Skeleton className="h-5 w-[90%] mx-auto" />
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
