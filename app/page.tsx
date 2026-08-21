import Link from 'next/link';

import { FlashToast } from '@/components/flash-toast';
import { PlaceFormDialog } from '@/components/places/place-form-dialog';
import { PlacesEmptyState } from '@/components/places/places-empty-state';
import { WouldReturnBadge } from '@/components/places/would-return-badge';
import { FLASH_PARAM } from '@/lib/flash';
import { getPlaces } from '@/lib/places';
import { firstParam } from '@/lib/utils';

export default async function Home({ searchParams }: PageProps<'/'>) {
	const places = await getPlaces();
	const params = await searchParams;

	return (
		<div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-8">
			<FlashToast flash={firstParam(params[FLASH_PARAM])} />

			{places.length === 0 ? (
				<PlacesEmptyState />
			) : (
				<>
					<div className="flex justify-end">
						<PlaceFormDialog />
					</div>

					<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{places.map(place => (
							<li key={place.id}>
								<Link
									href={`/places/${place.id}`}
									className="border-border hover:bg-muted block rounded-lg border p-4 transition-colors"
								>
									<h2 className="font-medium">
										{place.name}
									</h2>
									<WouldReturnBadge
										value={place.wouldReturn}
										className="mt-2"
									/>
								</Link>
							</li>
						))}
					</ul>
				</>
			)}
		</div>
	);
}
