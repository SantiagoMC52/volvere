import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Next.js gives repeated `searchParams` keys as an array; most of the time
// we only care about the first value.
export function firstParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}
