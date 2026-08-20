'use server';

import { revalidatePath } from 'next/cache';

import {
	insertPlace,
	updatePlace as updatePlaceRow,
	type PlaceInput
} from '@/lib/places';
import { getUser } from '@/lib/supabase/server';
import type { WouldReturn } from '@/types/place';

const WOULD_RETURN_VALUES: WouldReturn[] = ['yes', 'no', 'maybe'];

export type PlaceFormState = { error: string } | { ok: true } | null;

function optionalString(value: FormDataEntryValue | null): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

function parsePlaceInput(formData: FormData): PlaceInput | { error: string } {
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
	// RLS would reject an anonymous insert anyway, but checking here lets us
	// return a friendly message instead of a raw Postgres error.
	const user = await getUser();
	if (!user) {
		return { error: 'Debes iniciar sesión para añadir un sitio.' };
	}

	const input = parsePlaceInput(formData);
	if ('error' in input) {
		return input;
	}

	try {
		await insertPlace(user.id, input);
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

export async function updatePlace(
	id: string,
	_prevState: PlaceFormState,
	formData: FormData
): Promise<PlaceFormState> {
	const user = await getUser();
	if (!user) {
		return { error: 'Debes iniciar sesión para editar un sitio.' };
	}

	const input = parsePlaceInput(formData);
	if ('error' in input) {
		return input;
	}

	try {
		await updatePlaceRow(id, input);
	} catch (err) {
		const message =
			err instanceof Error
				? err.message
				: 'No se ha podido actualizar el sitio.';
		return { error: message };
	}

	revalidatePath('/');
	revalidatePath(`/places/${id}`);
	return { ok: true };
}
