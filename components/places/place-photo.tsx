'use client';

import { useCallback, useState } from 'react';

import { cn } from '@/lib/utils';

interface PlacePhotoProps {
	src: string;
	alt: string;
	// Goes on the frame: shape and the placeholder behind the photo.
	className?: string;
	// Goes on the <img>: how the photo sits inside that frame.
	imageClassName?: string;
}

// Fades the photo in over its placeholder instead of letting it snap into
// place. The wait itself is unchanged: signed URLs carry an expiry, so the URL
// differs on every render and the browser cache never kicks in.
//
// No loading="lazy" — it was tried and changed nothing. Browsers start lazy
// images well before they reach the viewport, and both the gallery at the foot
// of a short page and the carousel's off-screen slides sit inside that margin.
export function PlacePhoto({
	src,
	alt,
	className,
	imageClassName
}: PlacePhotoProps) {
	const [loaded, setLoaded] = useState(false);

	// An image the browser already has decoded fires `load` before React
	// attaches onLoad, stranding it at opacity-0. Happens with the object URLs
	// of a just-picked file, and in the lightbox, which reuses the exact URL
	// the carousel already fetched.
	const settleIfCached = useCallback((node: HTMLImageElement | null) => {
		if (node?.complete) {
			setLoaded(true);
		}
	}, []);

	return (
		<div className={cn('bg-muted overflow-hidden', className)}>
			<img
				ref={settleIfCached}
				src={src}
				alt={alt}
				onLoad={() => setLoaded(true)}
				className={cn(
					'transition-opacity duration-500',
					loaded ? 'opacity-100' : 'opacity-0',
					imageClassName
				)}
			/>
		</div>
	);
}
