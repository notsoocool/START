import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalysisLoading() {
	return (
		<div className="relative min-h-screen bg-fixed bg-gradient-to-b from-white/80 to-slate-50/80 dark:from-gray-900/80 dark:to-gray-900/80">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:py-10">
				{/* Header skeleton */}
				<div className="flex flex-col gap-4 md:flex-row md:items-center">
					<Skeleton className="h-10 w-48" />
					<Skeleton className="h-10 w-64" />
					<div className="flex gap-2">
						<Skeleton className="h-9 w-24" />
						<Skeleton className="h-9 w-24" />
					</div>
				</div>

				<Card className="overflow-hidden">
					<CardHeader className="border-b border-primary-100">
						<Skeleton className="h-6 w-32" />
					</CardHeader>
					<CardContent className="p-6">
						<div className="space-y-2">
							<Skeleton className="h-5 w-full" />
							<Skeleton className="h-5 w-[80%]" />
							<Skeleton className="h-5 w-3/4" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-40" />
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{[1, 2, 3, 4, 5].map((i) => (
								<Skeleton key={i} className="h-12 w-full" />
							))}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-24" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-24 w-full" />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
