// Limits and compression for place photos. Supabase's image transformations
// are a Pro-plan feature, so whatever lands in the bucket is what gets served:
// resizing and re-encoding happen here, in the browser. A ~4 MB phone photo
// comes out around 200 KB.
//
// compressImage runs when the photo is picked, not when the form is saved, so
// the preview shows the exact bytes that will be stored and an unreadable file
// says so straight away. The upload itself lives in lib/upload-images.ts.
//
// Nothing heavy is imported at the top: the Server Action and the toast copy
// read the limits below, and the HEIC decoder is only pulled in if a file
// actually needs it.

export const IMAGE_BUCKET = 'place-images';

// Also capped in the database: place_images has five sort_order slots with a
// unique constraint, so this holds even if a crafted request slips past.
export const MAX_IMAGES_PER_PLACE = 5;

const HEIC_MIME_TYPES = ['image/heic', 'image/heif'];

// Not every picker maps .heic to a MIME type — some hand over a File with an
// empty `type` — so HEIC is the one format recognised by extension too.
const HEIC_EXTENSIONS = ['.heic', '.heif'];

// The input side. The bucket itself only allows image/webp, since that is all
// compressImage produces.
//
// HEIC is in: iOS only transcodes to JPEG on the way out of the Photos picker,
// so a photo picked through "Explorar" (Files) arrives as the original .heic.
export const ACCEPTED_IMAGE_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	...HEIC_MIME_TYPES
];

// What the file input advertises. The extensions matter there too: without
// them, pickers that don't know the MIME type grey those files out.
export const IMAGE_INPUT_ACCEPT = [
	...ACCEPTED_IMAGE_MIME_TYPES,
	...HEIC_EXTENSIONS
].join(',');

// Caps the picked file, not the stored one. Decoding happens in memory — a
// bitmap costs width × height × 4 bytes — so a big enough file takes the tab
// down with it. 30 MB clears any phone or camera JPEG.
export const MAX_SOURCE_FILE_BYTES = 30 * 1024 * 1024;

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.8;

// Catches honest mistakes like picking a video, not attacks — `type` is
// whatever the browser chooses to report. The real guards are the bucket's
// allowed_mime_types and compressImage failing on a non-image.
export function isAcceptedImage(file: File): boolean {
	return (
		file.size <= MAX_SOURCE_FILE_BYTES &&
		(ACCEPTED_IMAGE_MIME_TYPES.includes(file.type) || looksLikeHeic(file))
	);
}

// A file no decoder here could read: a corrupt or exotic file, not a format
// question. Kept as its own type so the console says which half of
// compressImage gave up.
class ImageDecodeError extends Error {
	constructor(options?: ErrorOptions) {
		super('No se ha podido decodificar la imagen', options);
		this.name = 'ImageDecodeError';
	}
}

function looksLikeHeic(file: File): boolean {
	const name = file.name.toLowerCase();

	return (
		HEIC_MIME_TYPES.includes(file.type) ||
		HEIC_EXTENSIONS.some(extension => name.endsWith(extension))
	);
}

// createImageBitmap covers JPEG, PNG and WebP everywhere, and HEIC only on
// WebKit — which is why an iPhone photo opens on the phone but not in Chrome
// or Firefox. Those fall back to libheif, ~3 MB of compiled decoder that is
// imported here, inside the failure path, so it only ever reaches the browsers
// and the files that need it.
//
// `imageOrientation` applies the EXIF rotation tag; without it phone photos
// come out sideways.
async function decodeImage(file: File): Promise<ImageBitmap> {
	try {
		return await createImageBitmap(file, {
			imageOrientation: 'from-image'
		});
	} catch (err) {
		if (!looksLikeHeic(file)) {
			throw new ImageDecodeError({ cause: err });
		}

		try {
			// Swap for 'heic-to/csp' if this app ever serves a
			// Content-Security-Policy without 'unsafe-eval'.
			const { heicTo } = await import('heic-to');

			// No imageOrientation here: libheif applies the rotation stored in
			// the HEIC container itself, and what comes back is raw pixels
			// with no EXIF left to read.
			return await heicTo({ blob: file, type: 'bitmap' });
		} catch (heicErr) {
			throw new ImageDecodeError({ cause: heicErr });
		}
	}
}

// Scales the longest side down to MAX_DIMENSION (never up) and re-encodes as
// WebP. Browser-only.
export async function compressImage(file: File): Promise<Blob> {
	const bitmap = await decodeImage(file);

	try {
		const scale = Math.min(
			1,
			MAX_DIMENSION / Math.max(bitmap.width, bitmap.height)
		);
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);

		const context = canvas.getContext('2d');
		if (!context) {
			throw new Error('Canvas 2D no disponible');
		}
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

		const blob = await new Promise<Blob | null>(resolve =>
			canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY)
		);
		if (!blob) {
			throw new Error('toBlob no ha devuelto nada');
		}

		return blob;
	} finally {
		bitmap.close();
	}
}
