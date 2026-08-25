import type { WouldReturn } from '@/types/place';

// The values themselves, in the order the form offers them. A tuple rather
// than the type alone, because the select, the schema and the enum in the
// database all need the list at runtime and three hand-kept copies drift.
export const WOULD_RETURN_VALUES = [
	'yes',
	'no',
	'maybe'
] as const satisfies readonly WouldReturn[];

// Kept out of lib/places.ts so client components can use this map without
// pulling next/headers (via lib/supabase/server.ts) into the client bundle.
export const wouldReturnLabel: Record<WouldReturn, string> = {
	yes: 'Sí volvería',
	no: 'No volvería',
	maybe: 'Tal vez'
};
