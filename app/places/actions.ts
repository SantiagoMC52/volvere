'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
	deletePlace as deletePlaceRow,
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

export type DeletePlaceState = { error: string } | null;

export async function deletePlace(
	id: string,
	_prevState: DeletePlaceState,
	_formData: FormData
): Promise<DeletePlaceState> {
	const user = await getUser();
	if (!user) {
		return { error: 'Debes iniciar sesión para eliminar un sitio.' };
	}

	try {
		await deletePlaceRow(id);
	} catch (err) {
		const message =
			err instanceof Error
				? err.message
				: 'No se ha podido eliminar el sitio.';
		return { error: message };
	}

	revalidatePath('/');
	// Throws internally — the detail page for a deleted place has nothing
	// left to show, so send the user back to the listing.
	redirect('/');
}
