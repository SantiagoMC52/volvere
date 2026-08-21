import { GoogleIcon } from '@/components/icons/google';
import { Button } from '@/components/ui/button';
import { loginErrorMessage, sanitizeNextPath } from '@/lib/auth';
import { firstParam } from '@/lib/utils';

import { signInWithGoogle } from './actions';

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
	const params = await searchParams;
	const error = loginErrorMessage(firstParam(params.error));
	// The proxy sets `?next=` to the route the user was trying to reach.
	const next = sanitizeNextPath(firstParam(params.next));

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
			<div className="w-full max-w-sm space-y-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">
						Volveré
					</h1>
					<p className="text-muted-foreground text-sm">
						Guarda los sitios que quieres recordar.
					</p>
				</div>

				{error && (
					<p role="alert" className="text-destructive text-sm">
						{error}
					</p>
				)}

				<form action={signInWithGoogle}>
					<input type="hidden" name="next" value={next} />
					<Button
						type="submit"
						variant="outline"
						size="lg"
						className="w-full"
					>
						<GoogleIcon />
						Continuar con Google
					</Button>
				</form>
			</div>
		</div>
	);
}
