'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { withFlash } from '@/lib/flash';
import { MAX_IMAGES_PER_PLACE } from '@/lib/images';
import {
	removePlaceImageObjects,
	replacePlaceImages
} from '@/lib/place-images';
import { parsePlaceInput } from '@/lib/place-schema';
import {
	deletePlace as deletePlaceRow,
	getPlaceById,
	insertPlace,
	setPlaceShareToken,
	updatePlace as updatePlaceRow
} from '@/lib/places';
import { getUser } from '@/lib/supabase/server';

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only whether it worked: the caller turns this into one of the generic
// messages in lib/flash.ts. Anything more specific is logged, not returned.
export type PlaceFormState = { ok: boolean } | null;

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

	// Every rule the schema applies is also applied by the form, so a failure
	// here means the request did not come from it.
	const parsed = parsePlaceInput(formData);
	if (!parsed.ok) {
		console.error('[places] createPlace: invalid form data', parsed.errors);
		return { ok: false };
	}

	const imagePaths = parseImagePaths(formData, user.id, id);
	if (!imagePaths) {
		console.error('[places] createPlace: invalid image paths');
		return { ok: false };
	}

	try {
		await insertPlace(user.id, id, parsed.input);
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

	const parsed = parsePlaceInput(formData);
	if (!parsed.ok) {
		console.error('[places] updatePlace: invalid form data', parsed.errors);
		return { ok: false };
	}

	const imagePaths = parseImagePaths(formData, user.id, id);
	if (!imagePaths) {
		console.error('[places] updatePlace: invalid image paths');
		return { ok: false };
	}

	try {
		await updatePlaceRow(id, parsed.input);
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

export type ShareLinkState = { ok: true; token: string } | { ok: false };

// Idempotent on purpose: reopening the share dialog on a place that is already
// shared must hand back the same token. Minting a fresh one would quietly
// break the link somebody was already given.
//
// getPlaceById runs under RLS, so a place that isn't the caller's own comes
// back undefined and this refuses before writing anything.
export async function ensureShareLink(id: string): Promise<ShareLinkState> {
	const user = await getUser();
	if (!user) {
		console.error('[places] ensureShareLink: not signed in');
		return { ok: false };
	}

	try {
		const place = await getPlaceById(id);
		if (!place) {
			console.error('[places] ensureShareLink: place not found');
			return { ok: false };
		}

		if (place.shareToken) {
			return { ok: true, token: place.shareToken };
		}

		const token = crypto.randomUUID();
		await setPlaceShareToken(id, token);
		revalidatePath(`/places/${id}`);

		return { ok: true, token };
	} catch (err) {
		console.error('[places] ensureShareLink failed:', err);
		return { ok: false };
	}
}

// Revoking is just clearing the column: every copy of the link dies at once,
// and the page it pointed at answers like any other unknown token.
export async function revokeShareLink(id: string): Promise<{ ok: boolean }> {
	const user = await getUser();
	if (!user) {
		console.error('[places] revokeShareLink: not signed in');
		return { ok: false };
	}

	try {
		await setPlaceShareToken(id, null);
		revalidatePath(`/places/${id}`);
	} catch (err) {
		console.error('[places] revokeShareLink failed:', err);
		return { ok: false };
	}

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
