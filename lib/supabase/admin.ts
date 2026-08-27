import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// A client holding the project's secret key, which bypasses RLS entirely.
//
// It exists for exactly one job: signing the photos of a share link. A visitor
// is anonymous and the bucket grants `anon` nothing, so nobody else can sign
// them — and the alternative, a storage policy opening those objects to `anon`,
// also opens the bucket to being listed. See the note at the end of
// 20260826161515_add_place_share_token.sql.
//
// The variable has no NEXT_PUBLIC_ prefix, so Next refuses to inline it into a
// client bundle. Keep every use of this behind a token check.
export function createAdminClient() {
	const key = process.env.SUPABASE_SECRET_KEY;

	if (!key) {
		throw new Error(
			'Missing SUPABASE_SECRET_KEY: it signs the photos of a share link.'
		);
	}

	return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
		// Nothing here is a user session: no cookies to read, no token to keep
		// fresh, and no storage to leave one lying in.
		auth: { persistSession: false, autoRefreshToken: false }
	});
}
