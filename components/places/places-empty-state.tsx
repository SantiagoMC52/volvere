import { UtensilsCrossedIcon } from 'lucide-react';

import { PlaceFormDialog } from '@/components/places/place-form-dialog';

// Shown on the listing when the user has saved nothing yet. It carries the
// "add" button itself, so the page hides the one in its top bar while this is
// on screen — the same action twice would just be noise.
export function PlacesEmptyState() {
	return (
		<div className="border-border bg-card/50 flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
			<span
				aria-hidden="true"
				className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full"
			>
				<UtensilsCrossedIcon className="size-6" />
			</span>

			<div className="flex flex-col gap-1.5">
				<h2 className="text-lg font-semibold tracking-tight">
					Aún no hay ningún sitio
				</h2>
				<p className="text-muted-foreground max-w-sm text-sm text-balance">
					Apunta ese restaurante del que ya no recuerdas si valía la
					pena. Tu yo del mes que viene te lo agradecerá.
				</p>
			</div>

			<PlaceFormDialog />
		</div>
	);
}
