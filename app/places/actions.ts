'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { withFlash } from '@/lib/flash';
import { MAX_IMAGES_PER_PLACE } from '@/lib/images';
import {
	removePlaceImageObjects,
	replacePlaceImages
} from '@/lib/place-images';
import {
	deletePlace as deletePlaceRow,
	insertPlace,
	updatePlace as updatePlaceRow,
	type PlaceInput
} from '@/lib/places';
import { isDigitsOnly } from '@/lib/phone';
import { getUser } from '@/lib/supabase/server';
import type { WouldReturn } from '@/types/place';

const WOULD_RETURN_VALUES: WouldReturn[] = ['yes', 'no', 'maybe'];

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
	const phone = optionalString(formData.get('phone'));
	const wouldReturn = formData.get('wouldReturn');

	if (
		!name ||
		// The form only lets digits into this field, so anything else here
		// bypassed it.
		(phone !== null && !isDigitsOnly(phone)) ||
		typeof wouldReturn !== 'string' ||
		!WOULD_RETURN_VALUES.includes(wouldReturn as WouldReturn)
	) {
		return null;
	}

	return {
		name,
		description: optionalString(formData.get('description')),
		location: optionalString(formData.get('location')),
		phone,
		url: optionalString(formData.get('url')),
		wouldReturn: wouldReturn as WouldReturn
	};
}

// The browser uploads the photos itself — the 1MB Server Action body limit
// rules out routing them through here — and reports back the object keys it
// wrote. So these are untrusted strings: anything outside the caller's own
// {user_id}/{place_id}/ prefix is a bug or a hand-made POST.
function parseImagePaths(
	formData: FormData,
	userId: string,
	placeId: string
): string[] | null {
	const prefix = `${userId}/${placeId}/`;
	const paths = formData
		.getAll('imagePaths')
		.filter((value): value is string => typeof value === 'string');

	if (
		paths.length > MAX_IMAGES_PER_PLACE ||
		paths.some(path => !path.startsWith(prefix))
	) {
		return null;
	}

	return paths;
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

	// The id comes from the browser, not the database default: the photos were
	// uploaded to {user_id}/{place_id}/… while this place still didn't exist.
	// A collision fails on the primary key, which is the right outcome.
	const id = formData.get('id');
	if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
		console.error('[places] createPlace: invalid id');
		return { ok: false };
	}

	const input = parsePlaceInput(formData);
	if (!input) {
		console.error('[places] createPlace: invalid form data');
		return { ok: false };
	}

	const imagePaths = parseImagePaths(formData, user.id, id);
	if (!imagePaths) {
		console.error('[places] createPlace: invalid image paths');
		return { ok: false };
	}

	try {
		await insertPlace(user.id, id, input);
	} catch (err) {
		console.error('[places] createPlace failed:', err);
		return { ok: false };
	}

	try {
		await replacePlaceImages(id, imagePaths);
	} catch (err) {
		// Undo the insert. Retrying generates a fresh id, so leaving the place
		// behind would turn one failed save into two places, one photoless.
		console.error('[places] createPlace images failed:', err);
		await deletePlaceRow(id).catch(rollbackErr =>
			console.error('[places] createPlace rollback failed:', rollbackErr)
		);
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

	const imagePaths = parseImagePaths(formData, user.id, id);
	if (!imagePaths) {
		console.error('[places] updatePlace: invalid image paths');
		return { ok: false };
	}

	try {
		await updatePlaceRow(id, input);
		// The form sends the full list it is showing, so this also covers
		// removals: those photos drop out of the table and out of the bucket.
		await replacePlaceImages(id, imagePaths);
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
		// Before the row, not after: the cascade would take the place_images
		// rows with it, and those are the only record of which objects to drop.
		await removePlaceImageObjects(id);
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
