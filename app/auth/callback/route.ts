import { NextResponse } from 'next/server';

import { sanitizeNextPath, type LoginErrorCode } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

// Google returns here after the consent screen with a single-use `code`, which
// this endpoint swaps for a session. It has to be a Route Handler rather than a
// Server Component: only Route Handlers and Server Actions can write cookies.
export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url);

	// Behind a load balancer (Vercel) the request origin is the internal one,
	// not the public host the user came in through, so trust x-forwarded-host.
	const forwardedHost = request.headers.get('x-forwarded-host');
	const isLocalEnv = process.env.NODE_ENV === 'development';
	const baseUrl =
		!isLocalEnv && forwardedHost ? `https://${forwardedHost}` : origin;

	const next = sanitizeNextPath(searchParams.get('next'));
	const backToLogin = (error: LoginErrorCode) =>
		NextResponse.redirect(`${baseUrl}/login?error=${error}`);

	// On cancel or refusal Google returns an `error` and no code.
	const oauthError = searchParams.get('error');
	if (oauthError) {
		// A rejection for closed signups arrives as a generic `server_error`, with
		// the real reason only in `error_code`. Worth singling out: the account is
		// never getting in, so a "try again" message would be a lie.
		if (searchParams.get('error_code') === 'signup_disabled') {
			return backToLogin('signup_disabled');
		}

		return backToLogin(
			oauthError === 'access_denied' ? 'oauth_cancelled' : 'oauth_failed'
		);
	}

	const code = searchParams.get('code');
	if (!code) {
		return backToLogin('oauth_failed');
	}

	const supabase = await createClient();
	const { error } = await supabase.auth.exchangeCodeForSession(code);

	if (error) {
		console.error('[auth] exchangeCodeForSession failed:', error);
		return backToLogin('session_failed');
	}

	return NextResponse.redirect(`${baseUrl}${next}`);
}
