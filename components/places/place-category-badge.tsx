import {
	BedDoubleIcon,
	CircleParkingIcon,
	CompassIcon,
	ShoppingBagIcon,
	TagIcon,
	UtensilsIcon,
	type LucideIcon
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { placeCategoryLabel } from '@/lib/place-category';
import { cn } from '@/lib/utils';
import type { PlaceCategory } from '@/types/place';

// A glyph per category, so a card says what kind of place it is at a glance.
// Kept here rather than in lib/place-category.ts: that module is imported by
// the Zod schema on the server, and this is the only place that draws them.
const placeCategoryIcon: Record<PlaceCategory, LucideIcon> = {
	food: UtensilsIcon,
	lodging: BedDoubleIcon,
	parking: CircleParkingIcon,
	leisure: CompassIcon,
	shopping: ShoppingBagIcon,
	other: TagIcon
};

interface PlaceCategoryBadgeProps {
	value: PlaceCategory;
	className?: string;
}

// Neutral on purpose, unlike WouldReturnBadge: the status is the verdict and
// owns the colour; the category is just a label next to it.
export function PlaceCategoryBadge({
	value,
	className
}: PlaceCategoryBadgeProps) {
	const Icon = placeCategoryIcon[value];

	return (
		<Badge
			variant="outline"
			className={cn('text-muted-foreground', className)}
		>
			<Icon aria-hidden="true" />
			{placeCategoryLabel[value]}
		</Badge>
	);
}
