import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Two jobs: refresh the Supabase token before the request reaches a page, and
// run an optimistic guard on private routes. Optimistic is the operative word —
// the checks that actually protect data are each page's getUser() and the RLS
// policies. This only saves a wasted render and a client-side redirect.

// /auth/callback must be public: there is no session yet when Google sends the
// user back, and bouncing it to /login would mean the code is never exchanged.
// /s is the share links: whoever opens one has no account, and sending them to
// a login would defeat the entire point of the link.
const PUBLIC_PATHS = ['/login', '/auth/callback', '/s'];

function isPublicPath(pathname: string) {
	return PUBLIC_PATHS.some(
		path => pathname === path || pathname.startsWith(`${path}/`)
	);
}

export async function proxy(request: NextRequest) {
	let response = NextResponse.next({ request });
	// Kept aside so redirects can carry them too, since they are built from a
	// fresh NextResponse that inherits nothing from `response`.
	const authHeaders: Record<string, string> = {};

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet, headers) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value)
					);
					response = NextResponse.next({ request });
					cookiesToSet.forEach(({ name, value, options }) =>
						response.cookies.set(name, value, options)
					);
					// A response carrying auth cookies must never be cached by a CDN
					// or reverse proxy, or one user's session token could be served
					// to another. The library hands us the no-store headers for it.
					Object.assign(authHeaders, headers);
					Object.entries(headers).forEach(([key, value]) =>
						response.headers.set(key, value)
					);
				}
			}
		}
	);

	// Do not put code between createServerClient and getClaims(): getClaims() is
	// what triggers the token refresh, and that refresh is what fills `response`
	// with the new cookies before it is returned. It verifies the JWT locally
	// against the project's ES256 signing keys, so it costs no network round trip.
	const { data } = await supabase.auth.getClaims();
	const claims = data?.claims;

	// Redirecting with a bare NextResponse.redirect would drop the cookies a
	// refresh just wrote, leaving browser and server out of sync — and because
	// refresh tokens rotate, the stale one left in the browser is already spent,
	// so the user gets logged out on the next request.
	const redirectTo = (pathname: string, next?: string) => {
		const url = request.nextUrl.clone();
		url.search = '';
		url.pathname = pathname;

		if (next) {
			url.searchParams.set('next', next);
		}

		const redirect = NextResponse.redirect(url);
		response.cookies
			.getAll()
			.forEach(cookie => redirect.cookies.set(cookie));
		Object.entries(authHeaders).forEach(([key, value]) =>
			redirect.headers.set(key, value)
		);

		return redirect;
	};

	const { pathname, search } = request.nextUrl;

	if (!claims && !isPublicPath(pathname)) {
		return redirectTo('/login', `${pathname}${search}`);
	}

	if (claims && pathname === '/login') {
		return redirectTo('/');
	}

	return response;
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
	]
};
