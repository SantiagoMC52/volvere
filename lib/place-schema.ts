// Validation for the place form. The dialog caps the same fields, but that is
// a courtesy to whoever is typing: what reaches a Server Action is untrusted,
// so the rules are checked again here against the values that get stored.
//
// Zod lives in this file and nowhere else.

import { z } from 'zod';

import {
	DESCRIPTION_MAX,
	LOCATION_MAX,
	NAME_MAX,
	PHONE_MAX_DIGITS,
	PHONE_MIN_DIGITS,
	URL_MAX
} from '@/lib/place-limits';
import type { PlaceInput } from '@/lib/places';
import { WOULD_RETURN_VALUES } from '@/lib/would-return';

const PHONE_PATTERN = new RegExp(
	`^\\d{${PHONE_MIN_DIGITS},${PHONE_MAX_DIGITS}}$`
);

// A field the form never rendered arrives as null from FormData.get; one the
// user emptied arrives as ''. Both mean "not set", which is null in the
// database, so they are folded together before the length check — and the
// check runs on the trimmed value, since that is the one being stored.
//
// The union is what rejects a File: `imagePaths` aside, nothing in this form
// should submit one.
function optionalText(max: number) {
	return z
		.union([z.string(), z.null()])
		.transform(value => value?.trim() ?? '')
		.transform(value => (value === '' ? null : value))
		.pipe(z.string().max(max).nullable());
}

function phoneNumber() {
	return optionalText(PHONE_MAX_DIGITS).pipe(
		z.string().regex(PHONE_PATTERN).nullable()
	);
}

const placeInputSchema = z.object({
	name: z.string().trim().min(1).max(NAME_MAX),
	description: optionalText(DESCRIPTION_MAX),
	// Free text on purpose: an address typed by hand is as valid here as a
	// pasted link — see lib/location.ts, which decides between the two when
	// rendering.
	location: optionalText(LOCATION_MAX),
	phone: phoneNumber(),
	phoneSecondary: phoneNumber(),
	url: optionalText(URL_MAX).pipe(z.url().nullable()),
	wouldReturn: z.enum(WOULD_RETURN_VALUES)
});

export type PlaceInputResult =
	| { ok: true; input: PlaceInput }
	| { ok: false; errors: Record<string, string[] | undefined> };

// Returns the offending fields rather than a bare failure: the caller turns
// this into one generic message either way, but the reason has to reach the
// logs — and this is the shape a per-field error message would want later.
export function parsePlaceInput(formData: FormData): PlaceInputResult {
	const result = placeInputSchema.safeParse({
		name: formData.get('name'),
		description: formData.get('description'),
		location: formData.get('location'),
		phone: formData.get('phone'),
		phoneSecondary: formData.get('phoneSecondary'),
		url: formData.get('url'),
		wouldReturn: formData.get('wouldReturn')
	});

	return result.success
		? { ok: true, input: result.data }
		: { ok: false, errors: z.flattenError(result.error).fieldErrors };
}
