// Browser-only half of the photo pipeline: everything needing the browser
// Supabase client. Split from lib/images.ts so the Server Action can read the
// limits there without dragging the client bundle along.

import {
	IMAGE_BUCKET,
	OUTPUT_FILE_EXTENSION,
	OUTPUT_MIME_TYPE
} from '@/lib/images';
import { createClient } from '@/lib/supabase/client';

// Uploads to {user_id}/{place_id}/{uuid}.jpg — the layout the bucket's RLS
// policies key off — and returns the paths in the same order. The blobs are
// already JPEG: compressImage ran when the photos were picked, and refuses to
// hand back anything else.
export async function uploadPlaceImages(
	placeId: string,
	blobs: Blob[]
): Promise<string[]> {
	const supabase = createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error('No hay sesión activa');
	}

	// Serial rather than Promise.all: five files is nothing, and it keeps the
	// list of already-written objects accurate if one of them fails.
	const paths: string[] = [];
	try {
		for (const blob of blobs) {
			const name = `${crypto.randomUUID()}.${OUTPUT_FILE_EXTENSION}`;
			const path = `${user.id}/${placeId}/${name}`;

			const { error } = await supabase.storage
				.from(IMAGE_BUCKET)
				.upload(path, blob, { contentType: OUTPUT_MIME_TYPE });

			if (error) {
				throw new Error(error.message);
			}
			paths.push(path);
		}
	} catch (err) {
		// Nothing references these yet, so drop them rather than leave bytes
		// nobody can reach.
		await removeUploadedImages(paths);
		throw err;
	}

	return paths;
}

// Best-effort cleanup for objects uploaded but never recorded, because the
// Server Action that would have referenced them failed.
export async function removeUploadedImages(paths: string[]): Promise<void> {
	if (paths.length === 0) {
		return;
	}

	const supabase = createClient();
	const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);

	if (error) {
		console.error('[images] no se han podido limpiar las subidas:', error);
	}
}
