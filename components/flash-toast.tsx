'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { toast } from '@/components/ui/toast';
import {
	FLASH_MESSAGES,
	FLASH_PARAM,
	parseFlash,
	type FlashKey
} from '@/lib/flash';

// For actions that finish on the same page: same copy, shown directly
// instead of travelling through a redirect.
export function showFlash(key: FlashKey) {
	toast.add(FLASH_MESSAGES[key]);
}

interface FlashToastProps {
	// Raw `?flash=` value, read by the page's Server Component. Passed down
	// as a prop rather than read with useSearchParams here, which would force
	// this subtree out of prerendering and require a Suspense boundary.
	flash: string | undefined;
}

// Renders nothing: it only turns a `?flash=` tag left by a redirecting
// Server Action into a toast. See lib/flash.ts.
export function FlashToast({ flash }: FlashToastProps) {
	const router = useRouter();
	// Strict Mode runs effects twice in dev, and the toast would otherwise
	// fire again on any re-render before the URL is cleaned up.
	const shownRef = useRef<string | null>(null);

	useEffect(() => {
		const key = parseFlash(flash);
		if (!key || shownRef.current === key) {
			return;
		}

		shownRef.current = key;
		showFlash(key);

		// Drop the flag so a refresh doesn't replay the toast, keeping any
		// other query params intact.
		const url = new URL(window.location.href);
		url.searchParams.delete(FLASH_PARAM);
		router.replace(`${url.pathname}${url.search}`);
	}, [flash, router]);

	return null;
}
