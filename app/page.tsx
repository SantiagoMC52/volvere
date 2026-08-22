import { FlashToast } from '@/components/flash-toast';
import { PlacesList } from '@/components/places/places-list';
import { FLASH_PARAM } from '@/lib/flash';
import { getPlaces } from '@/lib/places';
import { firstParam } from '@/lib/utils';

export default async function Home({ searchParams }: PageProps<'/'>) {
	const places = await getPlaces();
	const params = await searchParams;

	return (
		<div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-8">
			<FlashToast flash={firstParam(params[FLASH_PARAM])} />

			<PlacesList
				places={places}
				initialQuery={firstParam(params.q)}
				initialStatus={firstParam(params.status)}
				initialSort={firstParam(params.sort)}
			/>
		</div>
	);
}
