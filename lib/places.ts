import { createClient } from '@/lib/supabase/server';
import type { Place, WouldReturn } from '@/types/place';

export { wouldReturnLabel } from '@/lib/would-return';

// Shape of a row as it comes back from public.places, before mapping to the
// camelCase `Place` the UI works with.
interface PlaceRow {
	id: string;
	name: string;
	description: string | null;
	location: string | null;
	phone: string | null;
	url: string | null;
	would_return: WouldReturn;
}

const PLACE_COLUMNS =
	'id, name, description, location, phone, url, would_return';

function toPlace(row: PlaceRow): Place {
	return {
		id: row.id,
		name: row.name,
		description: row.description ?? '',
		location: row.location ?? undefined,
		phone: row.phone ?? undefined,
		url: row.url ?? undefined,
		wouldReturn: row.would_return
	};
}

// RLS on public.places restricts every query to the signed-in user's own
// rows, so these already return the right data without filtering by user_id
// here.
export async function getPlaces(): Promise<Place[]> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from('places')
		.select(PLACE_COLUMNS)
		.order('created_at', { ascending: false });

	if (error) {
		throw new Error(`No se han podido cargar los sitios: ${error.message}`);
	}

	// Photos are deliberately not fetched here: the cards show name and status
	// only, so pulling them in would cost a signing round trip per page load
	// for something nothing renders.
	return (data ?? []).map(toPlace);
}

export async function getPlaceById(id: string): Promise<Place | undefined> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from('places')
		.select(PLACE_COLUMNS)
		.eq('id', id)
		.maybeSingle();

	if (error) {
		// Postgres rejects a non-uuid id (e.g. a stray slug) before RLS even
		// runs — treat that the same as "not found" instead of a hard error.
		if (error.code === '22P02') {
			return undefined;
		}
		throw new Error(`No se ha podido cargar el sitio: ${error.message}`);
	}

	return data ? toPlace(data) : undefined;
}

export interface PlaceInput {
	name: string;
	description: string | null;
	location: string | null;
	phone: string | null;
	url: string | null;
	wouldReturn: WouldReturn;
}

function toRow(input: PlaceInput) {
	return {
		name: input.name,
		description: input.description,
		location: input.location,
		phone: input.phone,
		url: input.url,
		would_return: input.wouldReturn
	};
}

// `userId` is a separate argument, not part of `PlaceInput`, because it must
// come from the authenticated session, never from form data. `id` is supplied
// instead of defaulted by the database because the photos are uploaded to
// {user_id}/{place_id}/… before this row exists — see app/places/actions.ts.
export async function insertPlace(
	userId: string,
	id: string,
	input: PlaceInput
): Promise<void> {
	const supabase = await createClient();
	const { error } = await supabase
		.from('places')
		.insert({ id, user_id: userId, ...toRow(input) });

	if (error) {
		throw new Error(`No se ha podido guardar el sitio: ${error.message}`);
	}
}

export async function updatePlace(
	id: string,
	input: PlaceInput
): Promise<void> {
	const supabase = await createClient();
	const { error } = await supabase
		.from('places')
		.update(toRow(input))
		.eq('id', id);

	if (error) {
		throw new Error(
			`No se ha podido actualizar el sitio: ${error.message}`
		);
	}
}

export async function deletePlace(id: string): Promise<void> {
	const supabase = await createClient();
	const { error } = await supabase.from('places').delete().eq('id', id);

	if (error) {
		throw new Error(`No se ha podido eliminar el sitio: ${error.message}`);
	}
}
