import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DeletePlaceButton } from '@/components/places/delete-place-button';
import { PlaceFormDialog } from '@/components/places/place-form-dialog';
import { PlaceGallery } from '@/components/places/place-gallery';
import { getPlaceImages } from '@/lib/place-images';
import { getPlaceById, wouldReturnLabel } from '@/lib/places';

export default async function PlacePage({
	params
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const place = await getPlaceById(id);

	if (!place) {
		notFound();
	}

	// After notFound(), not alongside it: getPlaceById absorbs a malformed
	// id, but querying the photos with one would throw.
	const images = await getPlaceImages(id);

	return (
		<div className="flex flex-1 flex-col gap-4 px-4 pb-8 sm:px-8">
			<Link
				href="/"
				className="text-muted-foreground w-fit text-sm hover:underline"
			>
				← Volver al listado
			</Link>

			<div className="flex items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h1 className="text-3xl font-semibold tracking-tight">
						{place.name}
					</h1>
					<p className="text-sm font-medium">
						{wouldReturnLabel[place.wouldReturn]}
					</p>
				</div>

				<div className="flex gap-2">
					<PlaceFormDialog place={place} images={images} />
					<DeletePlaceButton
						placeId={place.id}
						placeName={place.name}
					/>
				</div>
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

			<PlaceGallery images={images} placeName={place.name} />
		</div>
	);
}
