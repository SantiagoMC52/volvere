import { MapPinIcon } from 'lucide-react';

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { loginErrorMessage, sanitizeNextPath } from '@/lib/auth';
import { firstParam } from '@/lib/utils';

import { signInWithGoogle } from './actions';

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
	const params = await searchParams;
	const error = loginErrorMessage(firstParam(params.error));
	// The proxy sets `?next=` to the route the user was trying to reach.
	const next = sanitizeNextPath(firstParam(params.next));

	return (
		<div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-8">
			<div className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both w-full max-w-sm duration-500">
				<div className="border-border/70 bg-card ring-black/3 dark:ring-white/5 relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl border p-8 text-center shadow-sm ring-1">
					<span
						aria-hidden="true"
						className="bg-primary/20 absolute -top-6 left-1/2 size-40 -translate-x-1/2 rounded-full blur-3xl"
					/>

					<span
						aria-hidden="true"
						className="bg-primary/10 text-primary ring-primary/15 flex size-14 items-center justify-center rounded-full ring-4"
					>
						<MapPinIcon className="size-6" />
					</span>

					<div className="flex flex-col gap-2">
						<h1 className="text-2xl font-semibold tracking-tight">
							Volveré
						</h1>
						<p className="text-muted-foreground text-sm text-balance">
							Guarda los sitios que quieres recordar… o no.
						</p>
					</div>

					{error && (
						<p
							role="alert"
							className="border-destructive/30 bg-destructive/10 text-destructive w-full rounded-xl border px-3 py-2 text-sm"
						>
							{error}
						</p>
					)}

					<form action={signInWithGoogle} className="w-full">
						<input type="hidden" name="next" value={next} />
						<GoogleSignInButton />
					</form>
				</div>

				<p className="text-muted-foreground/80 mt-5 text-center text-xs text-balance">
					Solo con tu cuenta de Google. Sin contraseñas que recordar.
				</p>
			</div>
		</div>
	);
}
