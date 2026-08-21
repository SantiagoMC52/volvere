import {
	FileTextIcon,
	GlobeIcon,
	ImagesIcon,
	MapPinIcon,
	PhoneIcon
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DeletePlaceButton } from '@/components/places/delete-place-button';
import { PlaceField } from '@/components/places/place-field';
import { PlaceFormDialog } from '@/components/places/place-form-dialog';
import { PlaceGallery } from '@/components/places/place-gallery';
import { WouldReturnBadge } from '@/components/places/would-return-badge';
import { getPlaceImages } from '@/lib/place-images';
import { getPlaceById } from '@/lib/places';

export default async function PlacePage({ params }: PageProps<'/places/[id]'>) {
	const { id } = await params;
	const place = await getPlaceById(id);

	if (!place) {
		notFound();
	}

	// After notFound(), not alongside it: getPlaceById absorbs a malformed
	// id, but querying the photos with one would throw.
	const images = await getPlaceImages(id);

	// `description` is '' rather than null when empty (see lib/places.ts), and a
	// field holding only spaces should count as empty too.
	const description = place.description.trim();

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-12 sm:px-8">
			<Link
				href="/"
				className="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors"
			>
				← Volver al listado
			</Link>

			<header className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex flex-col items-start gap-2">
					<h1 className="text-3xl font-semibold tracking-tight">
						{place.name}
					</h1>
					<WouldReturnBadge value={place.wouldReturn} />
				</div>

				<div className="flex gap-2">
					<PlaceFormDialog place={place} images={images} />
					<DeletePlaceButton
						placeId={place.id}
						placeName={place.name}
					/>
				</div>
			</header>

			<PlaceField
				label="Notas"
				icon={FileTextIcon}
				empty="Sin notas todavía."
			>
				{description && (
					<p className="max-w-prose text-sm whitespace-pre-line">
						{description}
					</p>
				)}
			</PlaceField>

			<div className="grid gap-4 sm:grid-cols-2">
				<PlaceField
					label="Ubicación"
					icon={MapPinIcon}
					empty="Sin ubicación."
				>
					{place.location && (
						<p className="text-sm">{place.location}</p>
					)}
				</PlaceField>

				<PlaceField
					label="Teléfono"
					icon={PhoneIcon}
					empty="Sin teléfono."
				>
					{place.phone && (
						<a
							href={`tel:${place.phone.replace(/[^+\d]/g, '')}`}
							className="text-primary w-fit text-sm underline underline-offset-4"
						>
							{place.phone}
						</a>
					)}
				</PlaceField>
			</div>

			<PlaceField label="Web" icon={GlobeIcon} empty="Sin web.">
				{place.url && (
					<a
						href={place.url}
						target="_blank"
						rel="noreferrer"
						className="text-primary w-fit text-sm break-all underline underline-offset-4"
					>
						{/* The scheme is noise once it is a link, and dropping it
						    keeps a long URL from pushing the card wider. */}
						{place.url
							.replace(/^https?:\/\//, '')
							.replace(/\/$/, '')}
					</a>
				)}
			</PlaceField>

			<PlaceField
				label="Fotos"
				icon={ImagesIcon}
				empty="Sin fotos todavía."
			>
				{images.length > 0 && (
					<PlaceGallery images={images} placeName={place.name} />
				)}
			</PlaceField>
		</div>
	);
}
