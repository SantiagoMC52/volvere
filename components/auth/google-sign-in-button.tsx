'use client';

import { Loader2Icon } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import { GoogleIcon } from '@/components/icons/google';
import { Button } from '@/components/ui/button';

// The only visible sign of progress is the redirect to Google's consent
// screen, which takes a round trip to our server first. `useFormStatus` reads
// the enclosing <form>'s state, so this stays a child of the login page's form
// and the page itself stays a server component.
export function GoogleSignInButton() {
	const { pending } = useFormStatus();

	return (
		<Button
			type="submit"
			variant="outline"
			size="lg"
			disabled={pending}
			aria-live="polite"
			className="h-11 w-full gap-2.5 shadow-sm"
		>
			{pending ? (
				<>
					<Loader2Icon className="animate-spin" />
					Conectando con Google…
				</>
			) : (
				<>
					<GoogleIcon />
					Continuar con Google
				</>
			)}
		</Button>
	);
}
