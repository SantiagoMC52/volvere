// Limits and compression for place photos. Supabase's image transformations
// are a Pro-plan feature, so whatever lands in the bucket is what gets served:
// resizing and re-encoding happen here, in the browser, before the upload. A
// ~4 MB phone photo comes out around 200 KB.
//
// Kept dependency-free so the Server Action and the toast copy can read these
// limits. The upload itself lives in lib/upload-images.ts.

export const IMAGE_BUCKET = 'place-images';

// Also capped in the database: place_images has five sort_order slots with a
// unique constraint, so this holds even if a crafted request slips past.
export const MAX_IMAGES_PER_PLACE = 5;

// The input side. The bucket itself only allows image/webp, since that is all
// compressImage produces. HEIC is out: canvas can't decode it, and iOS hands
// over JPEG from a file input anyway.
export const ACCEPTED_IMAGE_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp'
];

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
		ACCEPTED_IMAGE_MIME_TYPES.includes(file.type) &&
		file.size <= MAX_SOURCE_FILE_BYTES
	);
}

// Scales the longest side down to MAX_DIMENSION (never up) and re-encodes as
// WebP. Browser-only.
export async function compressImage(file: File): Promise<Blob> {
	// Applies the EXIF rotation tag; without it phone photos come out sideways.
	const bitmap = await createImageBitmap(file, {
		imageOrientation: 'from-image'
	});

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
