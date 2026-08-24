import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { wouldReturnLabel } from '@/lib/would-return';
import type { WouldReturn } from '@/types/place';

const STATUS_STYLES: Record<WouldReturn, string> = {
	yes: 'border-status-yes/35 bg-status-yes/15 text-status-yes',
	no: 'border-status-no/35 bg-status-no/15 text-status-no',
	maybe: 'border-status-maybe/35 bg-status-maybe/15 text-status-maybe'
};

interface WouldReturnBadgeProps {
	value: WouldReturn;
	className?: string;
}

export function WouldReturnBadge({ value, className }: WouldReturnBadgeProps) {
	return (
		<Badge
			variant="outline"
			className={cn(STATUS_STYLES[value], className)}
		>
			{wouldReturnLabel[value]}
		</Badge>
	);
}
