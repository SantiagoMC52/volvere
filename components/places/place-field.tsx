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
		<section className="bg-card flex flex-col gap-2 rounded-xl border p-4">
			<h2 className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
				<Icon className="size-3.5" aria-hidden="true" />
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
