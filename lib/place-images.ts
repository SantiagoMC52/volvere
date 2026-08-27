import type { SupabaseClient } from '@supabase/supabase-js';

import { IMAGE_BUCKET } from '@/lib/images';
import { createClient } from '@/lib/supabase/server';
import type { PlaceImage } from '@/types/place';

// The bucket is private, so every <img> needs a signature. An hour outlives
// any page view without handing out a link that stays good forever.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

// One request for the whole batch, not one per photo. Paths that can't be
// signed are absent from the map rather than present and broken.
//
// The client is an argument because the two callers sign as different people:
// an owner looking at their own place uses their session, while a visitor on a
// share link has none and is signed for by lib/supabase/admin.ts.
export async function signImagePaths(
	supabase: SupabaseClient,
	paths: string[]
): Promise<Map<string, string>> {
	if (paths.length === 0) {
		return new Map();
	}

	const { data, error } = await supabase.storage
		.from(IMAGE_BUCKET)
		.createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

	if (error) {
		console.error(
			'[place-images] no se han podido firmar las URLs:',
			error
		);
		return new Map();
	}

	return new Map(
		(data ?? []).flatMap(item =>
			item.path && item.signedUrl
				? ([[item.path, item.signedUrl]] as const)
				: []
		)
	);
}

export async function getPlaceImages(placeId: string): Promise<PlaceImage[]> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from('place_images')
		.select('id, storage_path')
		.eq('place_id', placeId)
		.order('sort_order');

	if (error) {
		throw new Error(`No se han podido cargar las fotos: ${error.message}`);
	}

	const rows = (data ?? []) as { id: string; storage_path: string }[];
	const urls = await signImagePaths(
		supabase,
		rows.map(row => row.storage_path)
	);

	return rows.flatMap(row => {
		const url = urls.get(row.storage_path);
		// No signature means the object is gone from the bucket; skip it
		// instead of rendering an image that will 404.
		return url ? [{ id: row.id, path: row.storage_path, url }] : [];
	});
}

// Rewrites the whole image set of a place, in the given order, and drops the
// objects that fall out of it.
//
// Replaces rather than diffs: with five rows at most, that's less code than
// working out which sort_orders moved. The delete and the insert are two
// statements, not one transaction, so a failed insert leaves the place with no
// image rows — the caller reports the error and the user retries.
export async function replacePlaceImages(
	placeId: string,
	paths: string[]
): Promise<void> {
	const supabase = await createClient();

	const { data: current, error: readError } = await supabase
		.from('place_images')
		.select('storage_path')
		.eq('place_id', placeId);

	if (readError) {
		throw new Error(
			`No se han podido leer las fotos actuales: ${readError.message}`
		);
	}

	const { error: deleteError } = await supabase
		.from('place_images')
		.delete()
		.eq('place_id', placeId);

	if (deleteError) {
		throw new Error(
			`No se han podido borrar las fotos anteriores: ${deleteError.message}`
		);
	}

	if (paths.length > 0) {
		const { error: insertError } = await supabase
			.from('place_images')
			.insert(
				paths.map((storagePath, index) => ({
					place_id: placeId,
					storage_path: storagePath,
					sort_order: index
				}))
			);

		if (insertError) {
			throw new Error(
				`No se han podido guardar las fotos: ${insertError.message}`
			);
		}
	}

	// Dropping the rows doesn't touch the bytes: without this, every removed
	// photo would keep eating the quota with nothing pointing at it.
	const orphaned = ((current ?? []) as { storage_path: string }[])
		.map(row => row.storage_path)
		.filter(path => !paths.includes(path));

	await removeImageObjects(orphaned);
}

// Must run *before* the place row goes away: `on delete cascade` takes the
// place_images rows with it, and those rows are the only record of which
// objects belong to it.
export async function removePlaceImageObjects(placeId: string): Promise<void> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from('place_images')
		.select('storage_path')
		.eq('place_id', placeId);

	if (error) {
		throw new Error(
			`No se han podido leer las fotos del sitio: ${error.message}`
		);
	}

	await removeImageObjects(
		((data ?? []) as { storage_path: string }[]).map(
			row => row.storage_path
		)
	);
}

// Non-fatal on purpose: the database already says what the user asked for, and
// failing the whole action over leftover bytes would be worse than logging it.
async function removeImageObjects(paths: string[]): Promise<void> {
	if (paths.length === 0) {
		return;
	}

	const supabase = await createClient();
	const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);

	if (error) {
		console.error(
			'[place-images] no se han podido borrar los objetos:',
			error
		);
	}
}
