import { Link2OffIcon } from 'lucide-react';

import { VolvereMark } from '@/components/icons/volvere';

// Shown when the page calls notFound(): the link was revoked, the place was
// deleted, or the address is wrong. The copy covers all three without saying
// which, so it never confirms to a stranger that a token was once valid.
//
// Scoped to this segment on purpose — the rest of the app keeps the default
// 404. Whoever lands here has no account, so there is nothing to link to: a
// button would only drop them on a login screen.
export default function SharedPlaceNotFound() {
	return (
		<div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
			<span className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-full">
				<Link2OffIcon className="size-5" />
			</span>

			<h1 className="text-xl font-semibold tracking-tight">
				Este enlace ya no funciona
			</h1>

			<p className="text-muted-foreground text-sm text-pretty">
				Puede que se haya dejado de compartir o que la dirección no sea
				correcta. Pídeselo otra vez a quien te lo pasó.
			</p>

			<div className="text-muted-foreground/70 mt-6 flex items-center gap-2">
				<VolvereMark className="size-4 shrink-0" />
				<span className="text-xs font-medium">Volveré</span>
			</div>
		</div>
	);
}
