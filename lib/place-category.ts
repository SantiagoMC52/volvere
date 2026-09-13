import type { PlaceCategory } from '@/types/place';

// Same shape as lib/would-return.ts, for the same reason: the form, the
// filter, the schema and the enum in the database all need the list at
// runtime. The order is the one the selects show.
export const PLACE_CATEGORY_VALUES = [
	'food',
	'lodging',
	'parking',
	'leisure',
	'shopping',
	'other'
] as const satisfies readonly PlaceCategory[];

export const placeCategoryLabel: Record<PlaceCategory, string> = {
	food: 'Comida',
	lodging: 'Alojamiento',
	parking: 'Parking',
	leisure: 'Ocio',
	shopping: 'Compras',
	other: 'Otros'
};
