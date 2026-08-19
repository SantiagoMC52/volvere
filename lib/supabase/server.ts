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
