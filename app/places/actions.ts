'use server';

import { revalidatePath } from 'next/cache';

import { insertPlace } from '@/lib/places';
import { getUser } from '@/lib/supabase/server';
import type { WouldReturn } from '@/types/place';

const WOULD_RETURN_VALUES: WouldReturn[] = ['yes', 'no', 'maybe'];

export type CreatePlaceState = { error: string } | { ok: true } | null;

function optionalString(value: FormDataEntryValue | null): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

export async function createPlace(
	_prevState: CreatePlaceState,
	formData: FormData
): Promise<CreatePlaceState> {
	// RLS would reject an anonymous insert anyway, but checking here lets us
	// return a friendly message instead of a raw Postgres error.
	const user = await getUser();
	if (!user) {
		return { error: 'Debes iniciar sesión para añadir un sitio.' };
	}

	const name = optionalString(formData.get('name'));
	if (!name) {
		return { error: 'El nombre es obligatorio.' };
	}

	const wouldReturn = formData.get('wouldReturn');
	if (
		typeof wouldReturn !== 'string' ||
		!WOULD_RETURN_VALUES.includes(wouldReturn as WouldReturn)
	) {
		return { error: 'Selecciona si volverías o no.' };
	}

	try {
		await insertPlace({
			userId: user.id,
			name,
			description: optionalString(formData.get('description')),
			location: optionalString(formData.get('location')),
			phone: optionalString(formData.get('phone')),
			url: optionalString(formData.get('url')),
			wouldReturn: wouldReturn as WouldReturn
		});
	} catch (err) {
		const message =
			err instanceof Error
				? err.message
				: 'No se ha podido guardar el sitio.';
		return { error: message };
	}

	revalidatePath('/');
	return { ok: true };
}
