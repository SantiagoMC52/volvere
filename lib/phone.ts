// Phone numbers are stored as digits only — no spaces, separators or country
// prefix. The form strips anything else as it is typed; lib/place-schema.ts
// checks the same rule, plus a length, as a backstop against a hand-made POST.

export function digitsOnly(value: string): string {
	return value.replace(/\D/g, '');
}

export interface PlacePhone {
	field: 'phone' | 'phoneSecondary';
	number: string;
}

// Both numbers of a place, in order, dropping the ones it doesn't have. The
// `field` comes along as the list key: the same number saved twice would
// collide if the value keyed it.
export function toPhoneList(place: {
	phone?: string;
	phoneSecondary?: string;
}): PlacePhone[] {
	return (
		[
			['phone', place.phone],
			['phoneSecondary', place.phoneSecondary]
		] as const
	).flatMap(([field, number]) => (number ? [{ field, number }] : []));
}
