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
import { PlaceLink } from '@/components/places/place-link';
import { WouldReturnBadge } from '@/components/places/would-return-badge';
import { formatDate } from '@/lib/dates';
import { toLocationLink } from '@/lib/location';
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

	// Either a link pasted from a maps app or an address typed by hand; both
	// end up pointing at a map. See lib/location.ts.
	const locationLink = place.location && toLocationLink(place.location);

	const phones = (
		[
			['phone', place.phone],
			['phoneSecondary', place.phoneSecondary]
		] as const
	).flatMap(([field, number]) => (number ? [{ field, number }] : []));

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-12 sm:px-8">
			<Link
				href="/"
				className="text-muted-foreground hover:text-foreground w-fit text-sm transition-colors"
			>
				← Volver al listado
			</Link>

			<header className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex min-w-0 flex-col items-start gap-2">
					<h1 className="text-3xl font-semibold tracking-tight wrap-anywhere">
						{place.name}
					</h1>
					<WouldReturnBadge
						value={place.wouldReturn}
						className="px-3 py-1 text-sm"
					/>
					<p className="text-muted-foreground text-xs">
						Guardado el{' '}
						<time dateTime={place.createdAt}>
							{formatDate(place.createdAt)}
						</time>
					</p>
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
					<p className="max-w-prose text-sm whitespace-pre-line wrap-break-word">
						{description}
					</p>
				)}
			</PlaceField>

			{/* `grid-cols-1` is not redundant with the bare `grid`: without it
			    the mobile column is an implicit `auto` track, which a long
			    address widens past the screen. Spelled out it is
			    `minmax(0, 1fr)`, same as `sm:grid-cols-2` gives the rest. */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<PlaceField
					label="Ubicación"
					icon={MapPinIcon}
					empty="Sin ubicación."
				>
					{locationLink && (
						<PlaceLink href={locationLink.href} external>
							{locationLink.label}
						</PlaceLink>
					)}
				</PlaceField>

				<PlaceField
					label={phones.length > 1 ? 'Teléfonos' : 'Teléfono'}
					icon={PhoneIcon}
					empty="Sin teléfono."
				>
					{phones.length > 0 && (
						<div className="flex flex-col">
							{phones.map(({ field, number }) => (
								<PlaceLink
									key={field}
									href={`tel:${number}`}
									icon={PhoneIcon}
								>
									{number}
								</PlaceLink>
							))}
						</div>
					)}
				</PlaceField>
			</div>

			<PlaceField label="Web" icon={GlobeIcon} empty="Sin web.">
				{place.url && (
					<PlaceLink href={place.url} external>
						{/* The scheme is noise once it is a link, and dropping it
						    keeps a long URL from pushing the card wider. */}
						{place.url
							.replace(/^https?:\/\//, '')
							.replace(/\/$/, '')}
					</PlaceLink>
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
