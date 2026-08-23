// "Flash" messages: a toast that has to survive a redirect. A Server Action
// that redirects can't toast on its own (it runs on the server, and the
// component that dispatched it unmounts on navigation), so it tags the
// destination URL and the page there shows the toast.
//
// The URL carries a key, not the text itself, so a crafted link can't make
// the app display arbitrary messages to its own users.

import { MAX_SOURCE_FILE_BYTES } from '@/lib/images';

export type FlashType = 'success' | 'error' | 'info' | 'warning';

export interface FlashMessage {
	type: FlashType;
	title?: string;
	description: string;
}

// Failures are deliberately generic: the real reason (a Postgres error, a
// failed auth check) is logged server-side instead of shown, so nothing
// about the database leaks into the UI.
export const FLASH_MESSAGES = {
	'place-created': {
		type: 'success',
		description: 'Sitio añadido.'
	},
	'place-create-error': {
		type: 'error',
		description: 'Error al crear el sitio.'
	},
	'place-updated': {
		type: 'success',
		description: 'Cambios guardados.'
	},
	'place-update-error': {
		type: 'error',
		description: 'Error al editar el sitio.'
	},
	'place-deleted': {
		type: 'success',
		description: 'Sitio eliminado.'
	},
	'place-delete-error': {
		type: 'error',
		description: 'Error al eliminar el sitio.'
	},
	'image-upload-error': {
		type: 'error',
		description: 'Error al subir las fotos.'
	},
	// Fires while the picker is still fresh in mind, hence "alguna foto": the
	// rest of the batch does get added.
	'image-process-error': {
		type: 'error',
		description:
			'No se ha podido procesar alguna foto. Prueba a convertirla a JPG.'
	},
	// Built from the constant, not written out: the size it quotes has to
	// match the check that rejects the file.
	'image-rejected': {
		type: 'warning',
		description: `Solo fotos JPG, PNG, HEIC o WebP de menos de ${Math.round(
			MAX_SOURCE_FILE_BYTES / 1024 / 1024
		)} MB.`
	}
} as const satisfies Record<string, FlashMessage>;

export type FlashKey = keyof typeof FLASH_MESSAGES;

export const FLASH_PARAM = 'flash';

// Tags `path` so the destination page knows which toast to show.
export function withFlash(path: string, key: FlashKey): string {
	const [pathname, query] = path.split('?');
	const params = new URLSearchParams(query);
	params.set(FLASH_PARAM, key);

	return `${pathname}?${params}`;
}

export function parseFlash(value: string | undefined): FlashKey | null {
	return value && value in FLASH_MESSAGES ? (value as FlashKey) : null;
}
