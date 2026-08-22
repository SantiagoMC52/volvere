import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface PlaceFieldProps {
	label: string;
	icon: LucideIcon;
	// Shown in place of the content when this place has nothing for the field.
	empty: string;
	// Callers pass `value && <…>`, so an absent value arrives here as
	// `undefined`, `''` or `false` rather than as null.
	children?: ReactNode;
}

// One labelled section of the detail page. Every field gets a section whether
// or not it has a value: a place with no phone should say so, not silently
// leave a gap the reader has to notice.
export function PlaceField({
	label,
	icon: Icon,
	empty,
	children
}: PlaceFieldProps) {
	return (
		<section className="border-border/70 bg-card ring-black/3 dark:ring-white/5 flex flex-col gap-2 rounded-2xl border p-4 shadow-sm ring-1">
			<h2 className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
				<span
					aria-hidden="true"
					className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full"
				>
					<Icon className="size-3.5" />
				</span>
				{label}
			</h2>

			{/* `||`, not `??`: an absent value arrives as '' or false, and `??`
			    would let both through as content. */}
			{children || (
				<p className="text-muted-foreground text-sm">{empty}</p>
			)}
		</section>
	);
}
