import { createBrowserClient } from '@supabase/ssr';

// Supabase client for Client Components. No need for a fresh instance per
// call like the server one: `createBrowserClient` returns the same singleton
// per url + key, and reads the session from document.cookie.
export function createClient() {
	return createBrowserClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
	);
}
