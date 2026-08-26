import { cache } from 'react';

import { signImagePaths } from '@/lib/place-images';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { PlaceImage, SharedPlace } from '@/types/place';

// Reading by token goes through two security definer functions instead of the
// tables: `anon` has no grant on public.places at all, and giving it one would
// mean a policy that lets anybody list every shared place. See the migration
// 20260826161515_add_place_share_token.sql.
//
// The client is the ordinary cookie-bound one: the visitor is usually
// anonymous, but the grants cover `authenticated` too, so the owner opening
// their own link sees the same page as everyone else.

interface SharedPlaceRow {
	name: string;
	location: string | null;
	phone: string | null;
	phone_secondary: string | null;
	url: string | null;
}

// Postgres rejects a token that isn't a uuid before the function runs. A
// hand-typed or truncated link is a wrong link, not a server error.
const INVALID_TEXT_REPRESENTATION = '22P02';

// Wrapped in React.cache so generateMetadata and the page itself share one
// round trip instead of asking twice for the same token.
export const getSharedPlace = cache(
	async (token: string): Promise<SharedPlace | undefined> => {
		const supabase = await createClient();
		const { data, error } = await supabase.rpc('get_shared_place', {
			token
		});

		if (error) {
			if (error.code === INVALID_TEXT_REPRESENTATION) {
				return undefined;
			}
			throw new Error(
				`No se ha podido cargar el sitio compartido: ${error.message}`
			);
		}

		const row = (data as SharedPlaceRow[] | null)?.[0];
		if (!row) {
			return undefined;
		}

		return {
			name: row.name,
			location: row.location ?? undefined,
			phone: row.phone ?? undefined,
			phoneSecondary: row.phone_secondary ?? undefined,
			url: row.url ?? undefined
		};
	}
);

export async function getSharedPlaceImages(
	token: string
): Promise<PlaceImage[]> {
	const supabase = await createClient();
	const { data, error } = await supabase.rpc('get_shared_place_images', {
		token
	});

	if (error) {
		if (error.code === INVALID_TEXT_REPRESENTATION) {
			return [];
		}
		throw new Error(`No se han podido cargar las fotos: ${error.message}`);
	}

	// Signed with the secret key rather than the visitor's own client: the
	// bucket grants `anon` nothing, and opening it to `anon` would also open it
	// to being listed. Safe here because `rows` came back empty unless the
	// token matched — the check has already happened.
	const rows = (data ?? []) as { id: string; storage_path: string }[];
	const urls = await signImagePaths(
		createAdminClient(),
		rows.map(row => row.storage_path)
	);

	return rows.flatMap(row => {
		const url = urls.get(row.storage_path);
		return url ? [{ id: row.id, path: row.storage_path, url }] : [];
	});
}
