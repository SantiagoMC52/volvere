'use client';

import { SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { PlaceCard } from '@/components/places/place-card';
import { PlaceFormDialog } from '@/components/places/place-form-dialog';
import { PlacesEmptyState } from '@/components/places/places-empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { wouldReturnLabel } from '@/lib/would-return';
import type { Place, WouldReturn } from '@/types/place';

type StatusFilter = WouldReturn | 'all';
type SortOption = 'recent' | 'oldest';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
	{ value: 'all', label: 'Todos' },
	{ value: 'yes', label: wouldReturnLabel.yes },
	{ value: 'maybe', label: wouldReturnLabel.maybe },
	{ value: 'no', label: wouldReturnLabel.no }
];

// Same three hues as WouldReturnBadge, applied to a chip instead of a pill —
// only shown once that chip is the active filter.
const STATUS_CHIP_ACTIVE: Record<StatusFilter, string> = {
	all: 'border-primary/35 bg-primary/15 text-primary',
	yes: 'border-status-yes/35 bg-status-yes/15 text-status-yes',
	no: 'border-status-no/35 bg-status-no/15 text-status-no',
	maybe: 'border-status-maybe/35 bg-status-maybe/15 text-status-maybe'
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
	{ value: 'recent', label: 'Más recientes' },
	{ value: 'oldest', label: 'Más antiguos' }
];

const QUERY_PARAM = 'q';
const STATUS_PARAM = 'status';
const SORT_PARAM = 'sort';

function isStatusFilter(value: string | undefined): value is StatusFilter {
	return (
		value !== undefined &&
		STATUS_FILTERS.some(filter => filter.value === value)
	);
}

function isSortOption(value: string | undefined): value is SortOption {
	return value !== undefined && SORT_OPTIONS.some(o => o.value === value);
}

// Accent- and case-insensitive: "cordoba" should still find "Córdoba".
function normalize(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}

function matchesQuery(place: Place, query: string): boolean {
	if (!query) {
		return true;
	}

	const haystack = normalize(
		`${place.name} ${place.location ?? ''} ${place.description}`
	);
	return haystack.includes(normalize(query));
}

function countLabel(filtered: number, total: number): string {
	if (filtered === total) {
		return `${total} ${total === 1 ? 'sitio guardado' : 'sitios guardados'}`;
	}

	return `${filtered} de ${total} ${total === 1 ? 'sitio' : 'sitios'}`;
}

interface PlacesListProps {
	places: Place[];
	// Raw `?q=` / `?status=` / `?sort=` values, read by the page's Server
	// Component and passed down as props rather than read here with
	// useSearchParams, which would force this subtree out of prerendering and
	// require a Suspense boundary — same reasoning as FlashToast.
	initialQuery: string | undefined;
	initialStatus: string | undefined;
	initialSort: string | undefined;
}

export function PlacesList({
	places,
	initialQuery,
	initialStatus,
	initialSort
}: PlacesListProps) {
	const [query, setQuery] = useState(initialQuery ?? '');
	const [status, setStatus] = useState<StatusFilter>(
		isStatusFilter(initialStatus) ? initialStatus : 'all'
	);
	const [sort, setSort] = useState<SortOption>(
		isSortOption(initialSort) ? initialSort : 'recent'
	);

	// The URL is only a bookmark of the current filter, not the source of
	// truth for it — writing to it with `history.replaceState` keeps it in
	// sync without going through next/navigation's router, which would
	// re-fetch this Server Component for something already filtered
	// client-side (see the discussion that led here).
	useEffect(() => {
		const timeout = setTimeout(() => {
			const params = new URLSearchParams(window.location.search);

			if (query) {
				params.set(QUERY_PARAM, query);
			} else {
				params.delete(QUERY_PARAM);
			}

			if (status !== 'all') {
				params.set(STATUS_PARAM, status);
			} else {
				params.delete(STATUS_PARAM);
			}

			if (sort !== 'recent') {
				params.set(SORT_PARAM, sort);
			} else {
				params.delete(SORT_PARAM);
			}

			const search = params.toString();
			window.history.replaceState(
				null,
				'',
				search
					? `${window.location.pathname}?${search}`
					: window.location.pathname
			);
		}, 300);

		return () => clearTimeout(timeout);
	}, [query, status, sort]);

	const filtered = useMemo(
		() =>
			places.filter(
				place =>
					matchesQuery(place, query) &&
					(status === 'all' || place.wouldReturn === status)
			),
		[places, query, status]
	);

	// `places` already comes back "most recent first" from getPlaces(), so
	// 'recent' is just the filtered list as-is — 'oldest' is the same order
	// reversed, no need to re-sort by date.
	const sorted = useMemo(
		() => (sort === 'oldest' ? [...filtered].reverse() : filtered),
		[filtered, sort]
	);

	if (places.length === 0) {
		return <PlacesEmptyState />;
	}

	const filtersActive = query !== '' || status !== 'all';

	function clearFilters() {
		setQuery('');
		setStatus('all');
	}

	return (
		<div className="flex flex-1 flex-col gap-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-muted-foreground text-sm">
					{countLabel(filtered.length, places.length)}
				</p>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<div className="relative sm:w-64">
						<SearchIcon
							className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
							aria-hidden="true"
						/>
						<Input
							type="search"
							value={query}
							onChange={event => setQuery(event.target.value)}
							placeholder="Buscar sitios…"
							aria-label="Buscar sitios"
							className="pl-8"
						/>
						{query && (
							<button
								type="button"
								onClick={() => setQuery('')}
								aria-label="Borrar búsqueda"
								className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
							>
								<XIcon className="size-3.5" />
							</button>
						)}
					</div>

					<PlaceFormDialog />
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-wrap items-center gap-2">
					{STATUS_FILTERS.map(filter => {
						const active = status === filter.value;

						return (
							<button
								key={filter.value}
								type="button"
								aria-pressed={active}
								onClick={() => setStatus(filter.value)}
								className={cn(
									'rounded-full border px-2.5 py-1 text-sm font-medium transition-colors',
									active
										? STATUS_CHIP_ACTIVE[filter.value]
										: 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
								)}
							>
								{filter.label}
							</button>
						);
					})}
				</div>

				<Select
					value={sort}
					onValueChange={value => setSort(value as SortOption)}
				>
					<SelectTrigger size="sm" aria-label="Ordenar sitios">
						<SelectValue>
							{(value: SortOption | null) =>
								SORT_OPTIONS.find(o => o.value === value)
									?.label ?? SORT_OPTIONS[0].label
							}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{SORT_OPTIONS.map(option => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{filtered.length === 0 ? (
				<div className="border-border bg-card/50 flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
					<p className="text-muted-foreground max-w-sm text-sm text-balance">
						Ningún sitio coincide con la búsqueda o el filtro.
					</p>
					{filtersActive && (
						<Button
							variant="outline"
							size="sm"
							onClick={clearFilters}
						>
							Quitar filtros
						</Button>
					)}
				</div>
			) : (
				<ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{sorted.map((place, index) => (
						<PlaceCard key={place.id} place={place} index={index} />
					))}
				</ul>
			)}
		</div>
	);
}
