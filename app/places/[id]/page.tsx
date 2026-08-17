import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPlaceById, wouldReturnLabel } from '@/lib/places';

export default async function PlacePage({
	params
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const place = getPlaceById(id);

	if (!place) {
		notFound();
	}

	return (
		<div className="flex flex-1 flex-col gap-4 p-8">
			<Link
				href="/"
				className="text-muted-foreground w-fit text-sm hover:underline"
			>
				← Volver al listado
			</Link>

			<div className="flex flex-col gap-1">
				<h1 className="text-3xl font-semibold tracking-tight">
					{place.name}
				</h1>
				<p className="text-sm font-medium">
					{wouldReturnLabel[place.wouldReturn]}
				</p>
			</div>

			<p className="text-muted-foreground max-w-prose">
				{place.description}
			</p>

			{place.location && <p className="text-sm">📍 {place.location}</p>}

			{place.phone && (
				<a
					href={`tel:${place.phone.replace(/[^+\d]/g, '')}`}
					className="text-primary w-fit text-sm underline underline-offset-4"
				>
					📞 {place.phone}
				</a>
			)}

			{place.url && (
				<a
					href={place.url}
					target="_blank"
					rel="noreferrer"
					className="text-primary w-fit text-sm underline underline-offset-4"
				>
					Sitio web
				</a>
			)}
		</div>
	);
}
