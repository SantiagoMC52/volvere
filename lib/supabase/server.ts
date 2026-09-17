import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Supabase client for Server Components, Server Actions and Route Handlers.
// A new instance per request is required — never a shared global one — because
// each is bound to that request's cookie store.
export async function createClient() {
	const cookieStore = await cookies();

	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options)
						);
					} catch {
						// `setAll` throws when called from a Server Component. Safe to
						// ignore: the proxy already refreshes the session.
					}
				}
			}
		}
	);
}

// Wrapped in React.cache so every Server Component in the same request tree
// (root layout, page, nested pages) shares one call instead of each hitting
// Supabase Auth separately. Scoped to the current request only — see
// https://react.dev/reference/react/cache.
export const getUser = cache(async () => {
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	return user;
});

// Local JWT verification only — no round trip to Supabase Auth. The root
// layout uses it so the HTML shell can stream before the first network call:
// with getUser() there, nothing reached the browser (not even a loading
// skeleton) until Auth had answered. The claims carry email and user_metadata,
// which is all the header needs. Not a substitute for getUser() where data is
// at stake: a revoked session still holds a valid-looking token until it
// expires. The signing keys come from a process-wide cache the proxy has
// already warmed, so this never fetches them itself in practice.
export const getClaims = cache(async () => {
	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();

	return data?.claims ?? null;
});
