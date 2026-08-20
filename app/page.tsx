import Link from 'next/link';

import { AddPlaceDialog } from '@/components/places/add-place-dialog';
import { getPlaces, wouldReturnLabel } from '@/lib/places';

export default async function Home() {
	const places = await getPlaces();

	return (
		<div className="flex flex-1 flex-col gap-6 px-8 pb-8">
			<div className="flex justify-end">
				<AddPlaceDialog />
			</div>

			<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{places.map(place => (
					<li key={place.id}>
						<Link
							href={`/places/${place.id}`}
							className="border-border hover:bg-muted block rounded-lg border p-4 transition-colors"
						>
							<h2 className="font-medium">{place.name}</h2>
							<p className="text-muted-foreground text-sm">
								{wouldReturnLabel[place.wouldReturn]}
							</p>
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}
