import { UtensilsCrossedIcon } from 'lucide-react';

import { PlaceFormDialog } from '@/components/places/place-form-dialog';

// Shown on the listing when the user has saved nothing yet. It carries the
// "add" button itself, so the page hides the one in its top bar while this is
// on screen — the same action twice would just be noise.
export function PlacesEmptyState() {
	return (
		<div className="border-border bg-card/50 relative flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed px-6 py-16 text-center">
			{/* A soft glow behind the icon, not just a flat tint chip — the
			    empty state is the first thing a new user sees, so it carries
			    a little more colour than the rest of the app. */}
			<span
				aria-hidden="true"
				className="bg-primary/20 absolute top-6 left-1/2 -z-10 size-40 -translate-x-1/2 rounded-full blur-3xl"
			/>

			<span
				aria-hidden="true"
				className="bg-primary/10 text-primary ring-primary/15 relative flex size-14 items-center justify-center rounded-full ring-4"
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
