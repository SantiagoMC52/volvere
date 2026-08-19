'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { sanitizeNextPath } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

// Google OAuth is the only sign-in method for now. Unlike magic links and
// email+password it sends no email: without custom SMTP, Supabase's built-in
// mail server only delivers to project team members, so neither the magic link
// nor a password reset would ever reach a real user.

function siteUrl() {
	const url = process.env.NEXT_PUBLIC_SITE_URL;

	if (!url) {
		throw new Error(
			'Missing NEXT_PUBLIC_SITE_URL: it is the OAuth redirectTo base.'
		);
	}

	return url.replace(/\/+$/, '');
}

export async function signInWithGoogle(formData: FormData) {
	const next = sanitizeNextPath(formData.get('next')?.toString());
	const supabase = await createClient();

	// The full URL, `?next=` included, must match Supabase's allow list under
	// Authentication → URL Configuration → Redirect URLs. A `<site>/**` pattern
	// covers every destination.
	const callbackUrl = new URL('/auth/callback', siteUrl());
	callbackUrl.searchParams.set('next', next);

	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: { redirectTo: callbackUrl.toString() }
	});

	if (error) {
		console.error('[auth] signInWithOAuth failed:', error);
		redirect('/login?error=oauth_failed');
	}

	// signInWithOAuth does not redirect on the server: it returns Google's
	// consent URL and we are the ones who send the user there.
	redirect(data.url);
}

export async function signOut() {
	const supabase = await createClient();
	const { error } = await supabase.auth.signOut();

	// Head to /login even on failure: the session cookies are already cleared,
	// and leaving the user on a half-signed-out page is worse.
	if (error) {
		console.error('[auth] signOut failed:', error);
	}

	// The home page renders the user's email; without this it would stay cached.
	revalidatePath('/', 'layout');
	redirect('/login');
}
