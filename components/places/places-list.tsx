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
			{/*
				One flex container for every control, ordered rather than
				nested, so the two layouts can differ: stacked on mobile as
				count → search → filters → add (the primary action sits low,
				where a thumb reaches it, and search stays next to the filters
				it belongs with), and on desktop as count | search + add with
				the filters wrapping onto their own row via `sm:basis-full`.
			*/}
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-5">
				<p className="text-muted-foreground order-1 text-sm sm:mr-auto">
					{countLabel(filtered.length, places.length)}
				</p>

				<div className="relative order-2 sm:w-64">
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
						// `pr-9` keeps the text clear of the clear button.
						// WebKit draws its own clear button for
						// `type="search"`, which would sit on top of ours —
						// hidden here rather than dropping ours, since the
						// native one can't be sized to a usable target.
						className="h-9 pr-9 pl-8 sm:h-8 [&::-webkit-search-cancel-button]:appearance-none"
					/>
					{query && (
						<button
							type="button"
							onClick={() => setQuery('')}
							aria-label="Borrar búsqueda"
							// size-6 is the 24px minimum WCAG 2.2 asks of a
							// touch target; the icon inside stays small.
							className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-md"
						>
							<XIcon className="size-3.5" />
						</button>
					)}
				</div>

				{/* Stretches to full width on mobile, hugs its label on desktop. */}
				<div className="order-4 flex flex-col sm:order-3">
					<PlaceFormDialog />
				</div>

				<div className="order-3 flex flex-wrap items-center gap-2 sm:order-4 sm:basis-full">
					<Select
						value={status}
						onValueChange={value =>
							setStatus(value as StatusFilter)
						}
					>
						{/*
							`min-h` rather than `h`: the trigger sets its
							height with a `data-[size=…]` variant, which
							outranks a plain height class here.
						*/}
						<SelectTrigger
							size="sm"
							aria-label="Filtrar por estado"
							className="min-h-9 sm:min-h-0"
						>
							<SelectValue>
								{(value: StatusFilter | null) =>
									STATUS_FILTERS.find(f => f.value === value)
										?.label ?? STATUS_FILTERS[0].label
								}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{STATUS_FILTERS.map(filter => (
								<SelectItem
									key={filter.value}
									value={filter.value}
								>
									{filter.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select
						value={sort}
						onValueChange={value => setSort(value as SortOption)}
					>
						<SelectTrigger
							size="sm"
							aria-label="Ordenar sitios"
							className="min-h-9 sm:min-h-0"
						>
							<SelectValue>
								{(value: SortOption | null) =>
									SORT_OPTIONS.find(o => o.value === value)
										?.label ?? SORT_OPTIONS[0].label
								}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{SORT_OPTIONS.map(option => (
								<SelectItem
									key={option.value}
									value={option.value}
								>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
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
