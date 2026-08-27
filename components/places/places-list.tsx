'use client';

import {
	ArrowUpDownIcon,
	ListFilterIcon,
	SearchIcon,
	XIcon
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

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
import {
	FILTER_PARAMS,
	QUERY_PARAM,
	SORT_PARAM,
	STATUS_PARAM
} from '@/lib/place-filters';
import { cn } from '@/lib/utils';
import { wouldReturnLabel } from '@/lib/would-return';
import type { Place, WouldReturn } from '@/types/place';

type StatusFilter = WouldReturn | 'all';
type SortOption = 'recent' | 'oldest' | 'status';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
	{ value: 'all', label: 'Todos' },
	{ value: 'yes', label: wouldReturnLabel.yes },
	{ value: 'maybe', label: wouldReturnLabel.maybe },
	{ value: 'no', label: wouldReturnLabel.no }
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
	{ value: 'recent', label: 'Más recientes' },
	{ value: 'oldest', label: 'Más antiguos' },
	{ value: 'status', label: 'Primero los que sí' }
];

const STATUS_RANK: Record<WouldReturn, number> = { yes: 0, maybe: 1, no: 2 };

// A query string is user-editable, so anything read from it has to be checked
// against the options that actually exist before it reaches state.
function optionOrDefault<T extends string>(
	options: { value: T }[],
	raw: string | null,
	fallback: T
): T {
	return options.some(option => option.value === raw) ? (raw as T) : fallback;
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
}

export function PlacesList({ places }: PlacesListProps) {
	const searchParams = useSearchParams();

	const [query, setQuery] = useState(
		() => searchParams.get(QUERY_PARAM) ?? ''
	);
	const [status, setStatus] = useState(() =>
		optionOrDefault(STATUS_FILTERS, searchParams.get(STATUS_PARAM), 'all')
	);
	const [sort, setSort] = useState(() =>
		optionOrDefault(SORT_OPTIONS, searchParams.get(SORT_PARAM), 'recent')
	);

	// Only drives the toolbar's separating border: a permanent one would draw a
	// line across the design while it still sits in the flow. No CSS selector
	// for "currently stuck" has real support yet, but it pins at `top-0`, so its
	// own box answers the question.
	const toolbarRef = useRef<HTMLDivElement>(null);
	const [stuck, setStuck] = useState(false);

	useEffect(() => {
		const toolbar = toolbarRef.current;
		if (!toolbar) {
			return;
		}

		const update = () => setStuck(toolbar.getBoundingClientRect().top < 1);

		update();
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);

		return () => {
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
		};
	}, []);

	const filterSearch = useMemo(() => {
		const params = new URLSearchParams();

		if (query) {
			params.set(QUERY_PARAM, query);
		}
		if (status !== 'all') {
			params.set(STATUS_PARAM, status);
		}
		if (sort !== 'recent') {
			params.set(SORT_PARAM, sort);
		}

		return params.toString();
	}, [query, status, sort]);

	const [linkSearch, setLinkSearch] = useState(filterSearch);

	// The URL only bookmarks the current view, it isn't the source of truth for
	// it — `history.replaceState` keeps it in sync without going through
	// next/navigation's router, which would re-fetch the Server Component for
	// something already filtered client-side.
	useEffect(() => {
		const timeout = setTimeout(() => {
			const params = new URLSearchParams(window.location.search);

			for (const key of FILTER_PARAMS) {
				params.delete(key);
			}
			for (const [key, value] of new URLSearchParams(filterSearch)) {
				params.set(key, value);
			}

			const search = params.toString();
			window.history.replaceState(
				null,
				'',
				search
					? `${window.location.pathname}?${search}`
					: window.location.pathname
			);

			setLinkSearch(filterSearch);
		}, 300);

		return () => clearTimeout(timeout);
	}, [filterSearch]);

	const filtered = useMemo(
		() =>
			places.filter(
				place =>
					matchesQuery(place, query) &&
					(status === 'all' || place.wouldReturn === status)
			),
		[places, query, status]
	);

	// getPlaces() already returns newest first, so 'oldest' is that same list
	// reversed — no need to sort by date. 'status' only groups on top of that
	// order: Array.prototype.sort is stable, so each group still runs newest
	// first without comparing dates either.
	const sorted = useMemo(() => {
		if (sort === 'oldest') {
			return [...filtered].reverse();
		}

		if (sort === 'status') {
			return [...filtered].sort(
				(a, b) =>
					STATUS_RANK[a.wouldReturn] - STATUS_RANK[b.wouldReturn]
			);
		}

		return filtered;
	}, [filtered, sort]);

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
					{countLabel(sorted.length, places.length)}
				</p>

				<div className="flex flex-col">
					<PlaceFormDialog />
				</div>
			</div>

			{/*
				`bg-app` repaints the page's exact backdrop instead of tinting
				it: `--background` is near-white, so a translucent fill washed
				the gradients out into a pale band. Opaque, the cards scroll
				cleanly underneath. The negative margins cancel the page's own
				padding so the strip reaches the screen edges.
			*/}
			<div
				ref={toolbarRef}
				className={cn(
					'bg-app sticky top-0 z-10 -mx-4 flex flex-col gap-3 border-b px-4 py-3 transition-colors duration-200 sm:-mx-8 sm:flex-row sm:items-center sm:px-8',
					stuck ? 'border-border/60' : 'border-transparent'
				)}
			>
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
						// WebKit draws its own clear button for `type="search"`
						// that would sit on top of ours, and it can't be sized
						// to a usable target — hidden rather than dropping ours.
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

				<div className="flex flex-wrap items-center gap-2">
					<Select
						items={STATUS_FILTERS}
						value={status}
						onValueChange={value => setStatus(value ?? 'all')}
					>
						{/*
							`min-h` rather than `h`: the trigger sets its height
							with a `data-[size=…]` variant, which outranks a
							plain height class here.
						*/}
						<SelectTrigger
							size="sm"
							aria-label="Filtrar por estado"
							className="min-h-9 sm:min-h-0"
						>
							<ListFilterIcon
								className="text-muted-foreground size-3.5"
								aria-hidden="true"
							/>
							<SelectValue />
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
						items={SORT_OPTIONS}
						value={sort}
						onValueChange={value => setSort(value ?? 'recent')}
					>
						<SelectTrigger
							size="sm"
							aria-label="Ordenar sitios"
							className="min-h-9 sm:min-h-0"
						>
							<ArrowUpDownIcon
								className="text-muted-foreground size-3.5"
								aria-hidden="true"
							/>
							<SelectValue />
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

			{sorted.length === 0 ? (
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
							Limpiar filtros
						</Button>
					)}
				</div>
			) : (
				/* `grid-cols-1` is not redundant with the bare `grid`: it caps
				   the mobile track at `minmax(0, 1fr)` so nothing inside a
				   card can widen it. Same reason as in the detail page's
				   field grid. */
				<ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{sorted.map((place, index) => (
						<PlaceCard
							key={place.id}
							place={place}
							index={index}
							listSearch={linkSearch}
						/>
					))}
				</ul>
			)}
		</div>
	);
}
