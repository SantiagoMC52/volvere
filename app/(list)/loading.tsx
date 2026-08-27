import { Skeleton } from '@/components/ui/skeleton';

// This file is what the `(list)` group exists for: a loading boundary also
// covers every route nested under its segment, so at `app/` this listing
// skeleton would flash over /login and over a shared place too. Moving the
// page back out of the group brings that back without breaking anything
// loudly.
export default function LoadingPlaces() {
	return (
		<div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-8">
			<p role="status" className="sr-only">
				Cargando los sitios…
			</p>

			<div className="flex flex-1 flex-col gap-5">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-8 w-28" />
				</div>

				<div className="-mx-4 flex flex-col gap-3 border-b border-transparent px-4 py-3 sm:-mx-8 sm:flex-row sm:items-center sm:px-8">
					<Skeleton className="h-9 sm:h-8 sm:w-64" />
					<div className="flex flex-wrap items-center gap-2">
						<Skeleton className="h-9 w-28 sm:h-8" />
						<Skeleton className="h-9 w-36 sm:h-8" />
					</div>
				</div>

				<ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 3 }, (_, index) => (
						<li
							key={index}
							className="border-border/70 bg-card ring-black/3 dark:ring-white/5 flex flex-col gap-3 rounded-2xl border p-5 shadow-sm ring-1"
						>
							<Skeleton className="h-5 w-2/3" />
							<Skeleton className="h-3.5 w-full" />
							<Skeleton className="h-3.5 w-4/5" />
							<Skeleton className="mt-1 h-5 w-24 rounded-4xl" />
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
