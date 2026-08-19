// Shared by the proxy, the login Server Action and the Google callback Route
// Handler. No Next or Supabase imports: the proxy runs in a different runtime.

const DEFAULT_NEXT_PATH = '/';

/**
 * Only internal paths are accepted as a post-login destination, otherwise
 * /auth/callback would be an open redirect. `//evil.com` and `/\evil.com` start
 * with `/` but browsers resolve them as absolute URLs.
 */
export function sanitizeNextPath(value: string | null | undefined): string {
	if (!value?.startsWith('/')) {
		return DEFAULT_NEXT_PATH;
	}

	if (value.startsWith('//') || value.startsWith('/\\')) {
		return DEFAULT_NEXT_PATH;
	}

	return value;
}

// Auth failures reach /login as a code, never as text, so the message on screen
// is always one of ours: nobody can craft a /login?error=<phishing text> link.
const LOGIN_ERROR_MESSAGES = {
	oauth_cancelled: 'Has cancelado el acceso con Google.',
	oauth_failed:
		'Google no ha podido completar el acceso. Vuelve a intentarlo.',
	session_failed: 'No hemos podido abrir tu sesión. Vuelve a intentarlo.',
	// Deliberately does not say "try again": retrying can never work.
	signup_disabled: 'Volveré está cerrado a nuevos registros ahora mismo.'
} as const;

const FALLBACK_LOGIN_ERROR =
	'No hemos podido iniciar sesión. Vuelve a intentarlo.';

export type LoginErrorCode = keyof typeof LOGIN_ERROR_MESSAGES;

export function loginErrorMessage(code: string | undefined): string | null {
	if (!code) {
		return null;
	}

	return LOGIN_ERROR_MESSAGES[code as LoginErrorCode] ?? FALLBACK_LOGIN_ERROR;
}
