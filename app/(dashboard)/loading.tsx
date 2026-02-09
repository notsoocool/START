import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
	return (
		<div className="py-8 px-4">
			{/* Hero skeleton */}
			<section className="py-32 px-4 sm:px-6 lg:px-8 text-center">
				<div className="container mx-auto">
					<Skeleton className="h-14 w-full max-w-2xl mx-auto mb-6 rounded-lg" />
					<Skeleton className="h-6 w-full max-w-xl mx-auto mb-12 rounded" />
					<Skeleton className="h-12 w-40 mx-auto rounded-lg" />
				</div>
			</section>

			{/* About / Mission skeleton */}
			<section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900/50">
				<div className="container mx-auto text-center">
					<Skeleton className="h-10 w-48 mx-auto mb-8 rounded" />
					<Skeleton className="h-5 w-full max-w-2xl mx-auto rounded" />
					<Skeleton className="h-5 w-full max-w-xl mx-auto mt-3 rounded" />
				</div>
			</section>

			{/* Features skeleton */}
			<section className="py-24 px-4 sm:px-6 lg:px-8">
				<div className="container mx-auto">
					<Skeleton className="h-10 w-56 mx-auto mb-16 rounded" />
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
						{[1, 2, 3, 4, 5, 6].map((i) => (
							<div key={i} className="bg-white dark:bg-gray-900/50 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800">
								<Skeleton className="h-10 w-10 mb-4 rounded" />
								<Skeleton className="h-7 w-3/4 mb-4 rounded" />
								<Skeleton className="h-4 w-full rounded" />
								<Skeleton className="h-4 w-full mt-2 rounded" />
							</div>
						))}
					</div>
				</div>
			</section>
		</div>
	);
}
