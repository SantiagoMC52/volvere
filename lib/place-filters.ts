import { firstParam } from '@/lib/utils';

export const QUERY_PARAM = 'q';
export const STATUS_PARAM = 'status';
export const SORT_PARAM = 'sort';

export const FILTER_PARAMS = [QUERY_PARAM, STATUS_PARAM, SORT_PARAM] as const;

type SearchParams = Record<string, string | string[] | undefined>;

export function toListHref(params: SearchParams): string {
	const search = new URLSearchParams();

	for (const key of FILTER_PARAMS) {
		const value = firstParam(params[key]);
		if (value) {
			search.set(key, value);
		}
	}

	const query = search.toString();
	return query ? `/?${query}` : '/';
}
