import { ExternalLinkIcon, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface PlaceLinkProps {
	href: string;
	// Whether the link leaves the app for another tab. A tel: link hands off to
	// the dialer instead, which no target of ours should interfere with.
	external?: boolean;
	// What the row does, shown at its trailing edge. Defaults to the
	// external-link icon, which is what most of these values are.
	icon?: LucideIcon;
	children: ReactNode;
}

// The value of a PlaceField when it is actionable, rendered as a tappable row.
// The trailing icon — not a colour or an underline — is what marks it as a
// link: the field is already labelled and holds nothing else, so there is no
// surrounding text to tell it apart from, and an icon is a cue that survives on
// touch, where there is no hover.
export function PlaceLink({
	href,
	external = false,
	icon: Icon = ExternalLinkIcon,
	children
}: PlaceLinkProps) {
	return (
		<a
			href={href}
			target={external ? '_blank' : undefined}
			rel={external ? 'noreferrer' : undefined}
			className="hover:bg-accent focus-visible:ring-ring/50 -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3"
		>
			{/* `wrap-break-word` rather than `break-all`: an address has spaces
			    to wrap at, and a long URL still gets broken when it has to be. */}
			<span className="min-w-0 wrap-break-word">{children}</span>
			{external && (
				<span className="sr-only">(se abre en una pestaña nueva)</span>
			)}
			<Icon
				className="text-muted-foreground size-4 shrink-0"
				aria-hidden="true"
			/>
		</a>
	);
}
