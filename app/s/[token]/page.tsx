import {
	FileTextIcon,
	GlobeIcon,
	ImagesIcon,
	MapPinIcon,
	PhoneIcon
} from 'lucide-react';
import { notFound } from 'next/navigation';

import { VolvereMark } from '@/components/icons/volvere';
import { PlaceCategoryBadge } from '@/components/places/place-category-badge';
import { PlaceField } from '@/components/places/place-field';
import { PlaceGallery } from '@/components/places/place-gallery';
import { PlaceLink } from '@/components/places/place-link';
import { toLocationLink } from '@/lib/location';
import { toPhoneList } from '@/lib/phone';
import { getSharedPlace, getSharedPlaceImages } from '@/lib/shared-places';

// The one page anyone can open. What it may show is decided in SQL by
// public.get_shared_place, not here: the verdict and the date never reach this
// component in the first place, and the notes only when their owner chose to
// share them.

export async function generateMetadata({ params }: PageProps<'/s/[token]'>) {
	const { token } = await params;
	const place = await getSharedPlace(token);

	return {
		title: place ? `${place.name} · Volveré` : 'Volveré',
		// A share link is meant for one person, not for a search engine that
		// would keep serving it long after the token is revoked.
		robots: { index: false, follow: false }
	};
}

export default async function SharedPlacePage({
	params
}: PageProps<'/s/[token]'>) {
	const { token } = await params;
	const place = await getSharedPlace(token);

	// Revoked, mistyped, or never a token at all — all the same answer, so the
	// page never tells a stranger which of the three it was.
	if (!place) {
		notFound();
	}

	const images = await getSharedPlaceImages(token);
	const locationLink = place.location && toLocationLink(place.location);
	const phones = toPhoneList(place);

	// Same rule as the owner's page for the text; the field itself only
	// renders when something reaches here, since "sin notas" would read as
	// the owner having written none, and that is not the visitor's business.
	const description = place.description?.trim();

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-6 pb-12 sm:px-8 sm:pt-8">
			{/* The layout's header only renders for a signed-in user, so this is
			    the only thing telling a visitor where the page comes from. */}
			<div className="text-muted-foreground flex items-center gap-2">
				<VolvereMark className="size-5 shrink-0" />
				<span className="text-sm font-medium">Volveré</span>
			</div>

			<div className="flex flex-col items-start gap-2">
				<h1 className="text-3xl font-semibold tracking-tight wrap-anywhere">
					{place.name}
				</h1>
				{/* "Otros" tells a visitor nothing, so it stays off the page. */}
				{place.category !== 'other' && (
					<PlaceCategoryBadge
						value={place.category}
						className="px-3 py-1 text-sm"
					/>
				)}
			</div>

			{description && (
				<PlaceField
					label="Notas"
					icon={FileTextIcon}
					empty="Sin notas."
				>
					<p className="max-w-prose text-sm whitespace-pre-line wrap-break-word">
						{description}
					</p>
				</PlaceField>
			)}

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
						{place.url
							.replace(/^https?:\/\//, '')
							.replace(/\/$/, '')}
					</PlaceLink>
				)}
			</PlaceField>

			<PlaceField label="Fotos" icon={ImagesIcon} empty="Sin fotos.">
				{images.length > 0 && (
					<PlaceGallery images={images} placeName={place.name} />
				)}
			</PlaceField>
		</div>
	);
}
