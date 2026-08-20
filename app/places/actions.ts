'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { withFlash } from '@/lib/flash';
import {
	deletePlace as deletePlaceRow,
	insertPlace,
	updatePlace as updatePlaceRow,
	type PlaceInput
} from '@/lib/places';
import { getUser } from '@/lib/supabase/server';
import type { WouldReturn } from '@/types/place';

const WOULD_RETURN_VALUES: WouldReturn[] = ['yes', 'no', 'maybe'];

// Only whether it worked: the caller turns this into one of the generic
// messages in lib/flash.ts. Anything more specific is logged, not returned.
export type PlaceFormState = { ok: boolean } | null;

function optionalString(value: FormDataEntryValue | null): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

// Returns null when the form data is unusable. The fields it rejects are all
// marked `required` in the form, so this is a backstop against a hand-made
// POST rather than something a user hits by filling the dialog in.
function parsePlaceInput(formData: FormData): PlaceInput | null {
	const name = optionalString(formData.get('name'));
	const wouldReturn = formData.get('wouldReturn');

	if (
		!name ||
		typeof wouldReturn !== 'string' ||
		!WOULD_RETURN_VALUES.includes(wouldReturn as WouldReturn)
	) {
		return null;
	}

	return {
		name,
		description: optionalString(formData.get('description')),
		location: optionalString(formData.get('location')),
		phone: optionalString(formData.get('phone')),
		url: optionalString(formData.get('url')),
		wouldReturn: wouldReturn as WouldReturn
	};
}

export async function createPlace(
	_prevState: PlaceFormState,
	formData: FormData
): Promise<PlaceFormState> {
	// RLS would reject an anonymous insert anyway, but checking here keeps
	// the failure a clean { ok: false } instead of a thrown Postgres error.
	const user = await getUser();
	if (!user) {
		console.error('[places] createPlace: not signed in');
		return { ok: false };
	}

	const input = parsePlaceInput(formData);
	if (!input) {
		console.error('[places] createPlace: invalid form data');
		return { ok: false };
	}

	try {
		await insertPlace(user.id, input);
	} catch (err) {
		console.error('[places] createPlace failed:', err);
		return { ok: false };
	}

	revalidatePath('/');
	return { ok: true };
}

export async function updatePlace(
	id: string,
	_prevState: PlaceFormState,
	formData: FormData
): Promise<PlaceFormState> {
	const user = await getUser();
	if (!user) {
		console.error('[places] updatePlace: not signed in');
		return { ok: false };
	}

	const input = parsePlaceInput(formData);
	if (!input) {
		console.error('[places] updatePlace: invalid form data');
		return { ok: false };
	}

	try {
		await updatePlaceRow(id, input);
	} catch (err) {
		console.error('[places] updatePlace failed:', err);
		return { ok: false };
	}

	revalidatePath('/');
	revalidatePath(`/places/${id}`);
	return { ok: true };
}

export async function deletePlace(
	id: string,
	_prevState: PlaceFormState,
	_formData: FormData
): Promise<PlaceFormState> {
	const user = await getUser();
	if (!user) {
		console.error('[places] deletePlace: not signed in');
		return { ok: false };
	}

	try {
		await deletePlaceRow(id);
	} catch (err) {
		console.error('[places] deletePlace failed:', err);
		return { ok: false };
	}

	revalidatePath('/');
	// A plain `return` here would also re-render the current route (now
	// gone) in the same response and hit notFound() before the client ever
	// sees `state` update — redirect instead, so we never render that dead
	// route. The success toast rides along on the URL; see lib/flash.ts.
	redirect(withFlash('/', 'place-deleted'));
}
