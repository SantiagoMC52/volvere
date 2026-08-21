import { cn } from '@/lib/utils';
import { wouldReturnLabel } from '@/lib/would-return';
import type { WouldReturn } from '@/types/place';

// Indigo is the app's primary colour precisely so these three can keep green,
// red and amber to themselves. Each status paints a 10% tint of its own colour
// behind text of that same colour — see the palette note in app/globals.css.
const STATUS_STYLES: Record<WouldReturn, string> = {
	yes: 'border-status-yes/25 bg-status-yes/10 text-status-yes',
	no: 'border-status-no/25 bg-status-no/10 text-status-no',
	maybe: 'border-status-maybe/25 bg-status-maybe/10 text-status-maybe'
};

interface WouldReturnBadgeProps {
	value: WouldReturn;
	className?: string;
}

// The label already carries an emoji, so colour is never the only cue — this
// still reads for someone who can't tell red from green.
export function WouldReturnBadge({ value, className }: WouldReturnBadgeProps) {
	return (
		<span
			className={cn(
				'inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-sm font-medium',
				STATUS_STYLES[value],
				className
			)}
		>
			{wouldReturnLabel[value]}
		</span>
	);
}
