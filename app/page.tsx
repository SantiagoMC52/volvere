import { MapPinIcon } from 'lucide-react';
import Link from 'next/link';

import { FlashToast } from '@/components/flash-toast';
import { PlaceFormDialog } from '@/components/places/place-form-dialog';
import { PlacesEmptyState } from '@/components/places/places-empty-state';
import { WouldReturnBadge } from '@/components/places/would-return-badge';
import { FLASH_PARAM } from '@/lib/flash';
import { getPlaces } from '@/lib/places';
import { cn, firstParam } from '@/lib/utils';
import type { WouldReturn } from '@/types/place';

// Same three hues as WouldReturnBadge (see the palette note in
// app/globals.css), used here as a solid strip instead of a text/tint pair —
// the card gives its status colour away before you even read the badge.
const STATUS_ACCENT: Record<WouldReturn, string> = {
	yes: 'bg-status-yes',
	no: 'bg-status-no',
	maybe: 'bg-status-maybe'
};

export default async function Home({ searchParams }: PageProps<'/'>) {
	const places = await getPlaces();
	const params = await searchParams;

	return (
		<div className="flex flex-1 flex-col gap-6 px-4 pb-8 sm:px-8">
			<FlashToast flash={firstParam(params[FLASH_PARAM])} />

			{places.length === 0 ? (
				<PlacesEmptyState />
			) : (
				<>
					<div className="flex items-center justify-between gap-4">
						<p className="text-muted-foreground text-sm">
							{places.length}{' '}
							{places.length === 1
								? 'sitio guardado'
								: 'sitios guardados'}
						</p>
						<PlaceFormDialog />
					</div>

					<ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{places.map((place, index) => {
							const description = place.description.trim();

							return (
								<li
									key={place.id}
									// A gentle stagger on first paint only — capped so a
									// long list doesn't leave the last cards waiting.
									className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
									style={{
										animationDelay: `${Math.min(index, 8) * 60}ms`
									}}
								>
									<Link
										href={`/places/${place.id}`}
										className="group border-border/70 bg-card ring-black/3 dark:ring-white/5 relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border p-5 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
									>
										<span
											aria-hidden="true"
											className={cn(
												'absolute inset-x-0 top-0 h-1 opacity-80 transition-opacity group-hover:opacity-100',
												STATUS_ACCENT[place.wouldReturn]
											)}
										/>

										<h2 className="pr-1 leading-snug font-semibold tracking-tight text-balance">
											{place.name}
										</h2>

										{place.location && (
											<p className="text-muted-foreground flex items-center gap-1.5 text-sm">
												<MapPinIcon
													className="size-3.5 shrink-0"
													aria-hidden="true"
												/>
												<span className="truncate">
													{place.location}
												</span>
											</p>
										)}

										{description && (
											<p className="text-muted-foreground line-clamp-2 text-sm">
												{description}
											</p>
										)}

										<WouldReturnBadge
											value={place.wouldReturn}
											className="mt-auto self-start"
										/>
									</Link>
								</li>
							);
						})}
					</ul>
				</>
			)}
		</div>
	);
}
