import type { WouldReturn } from '@/types/place';

// Kept out of lib/places.ts so client components can use this map without
// pulling next/headers (via lib/supabase/server.ts) into the client bundle.
export const wouldReturnLabel: Record<WouldReturn, string> = {
	yes: 'Sí volvería',
	no: 'No volvería',
	maybe: 'Tal vez'
};
