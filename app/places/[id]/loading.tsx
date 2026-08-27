import { Skeleton } from '@/components/ui/skeleton';

function FieldSkeleton({ lines = 1 }: { lines?: number }) {
	return (
		<section className="border-border/70 bg-card ring-black/3 dark:ring-white/5 flex flex-col gap-2 rounded-2xl border p-4 shadow-sm ring-1">
			<div className="flex items-center gap-2">
				<Skeleton className="size-6 rounded-full" />
				<Skeleton className="h-3 w-20" />
			</div>
			{Array.from({ length: lines }, (_, index) => (
				<Skeleton key={index} className="h-3.5 w-full max-w-64" />
			))}
		</section>
	);
}

export default function LoadingPlace() {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-12 sm:px-8">
			<p role="status" className="sr-only">
				Cargando el sitio…
			</p>

			<Skeleton className="h-4 w-36" />

			<header className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex min-w-0 flex-col items-start gap-2">
					<Skeleton className="h-9 w-56" />
					<Skeleton className="h-7 w-28 rounded-4xl" />
					<Skeleton className="h-3 w-40" />
				</div>

				<div className="flex gap-2">
					<Skeleton className="h-8 w-24" />
					<Skeleton className="h-8 w-20" />
					<Skeleton className="h-8 w-24" />
				</div>
			</header>

			<FieldSkeleton lines={2} />

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<FieldSkeleton />
				<FieldSkeleton />
			</div>

			<FieldSkeleton />
			<FieldSkeleton />
		</div>
	);
}
