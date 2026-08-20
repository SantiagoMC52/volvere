'use client';

import { useState } from 'react';

import { PlacePhoto } from '@/components/places/place-photo';
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious
} from '@/components/ui/carousel';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import type { PlaceImage } from '@/types/place';

interface PlaceGalleryProps {
	images: PlaceImage[];
	placeName: string;
}

export function PlaceGallery({ images, placeName }: PlaceGalleryProps) {
	// Index, not the image itself: it's what the lightbox carousel needs to
	// open on the right slide. Null while the lightbox is closed.
	const [zoomed, setZoomed] = useState<number | null>(null);

	if (images.length === 0) {
		return null;
	}

	// With one photo the arrows would only ever render disabled.
	const hasSeveral = images.length > 1;

	return (
		<>
			{/*
				Capped, not `w-full`: on a wide screen the square would stretch
				to the whole column and dwarf the rest of the page. Still full
				width on a phone, where max-w-sm exceeds the viewport.
			*/}
			<Carousel className="w-full max-w-sm" opts={{ loop: true }}>
				<CarouselContent>
					{images.map((image, index) => (
						<CarouselItem key={image.id}>
							<button
								type="button"
								onClick={() => setZoomed(index)}
								aria-label={`Ampliar foto ${index + 1} de ${placeName}`}
								className="block w-full cursor-zoom-in"
							>
								{/* contain, not cover: a crop cuts the text off
									posters and menus. */}
								<PlacePhoto
									src={image.url}
									alt={`Foto ${index + 1} de ${placeName}`}
									className="aspect-square w-full rounded-lg"
									imageClassName="size-full object-contain"
								/>
							</button>
						</CarouselItem>
					))}
				</CarouselContent>
				{hasSeveral && (
					<>
						{/* The registry puts these outside the frame
							(-left-12), which overflows on a phone. */}
						<CarouselPrevious className="left-2" />
						<CarouselNext className="right-2" />
					</>
				)}
			</Carousel>

			<Dialog
				open={zoomed !== null}
				onOpenChange={open => {
					if (!open) {
						setZoomed(null);
					}
				}}
			>
				{/* No padding or panel background: the photo is the only
					thing on screen. */}
				<DialogContent className="bg-transparent p-0 ring-0 sm:max-w-3xl!">
					<DialogHeader className="sr-only">
						<DialogTitle>Fotos de {placeName}</DialogTitle>
						<DialogDescription>
							Desliza o usa las flechas para ver el resto.
						</DialogDescription>
					</DialogHeader>

					{/*
						`key` remounts the carousel on each click: startIndex is
						read only on init, so without it the lightbox would
						always reopen on the same slide.
					*/}
					<Carousel
						key={zoomed}
						className="w-full"
						opts={{ startIndex: zoomed ?? 0, loop: true }}
					>
						<CarouselContent>
							{images.map((image, index) => (
								<CarouselItem key={image.id}>
									{/* No placeholder needed: same URL the carousel
										already fetched, so it is there instantly. */}
									<PlacePhoto
										src={image.url}
										alt={`Foto ${index + 1} de ${placeName}`}
										className="rounded-lg bg-transparent"
										imageClassName="max-h-[85vh] w-full object-contain"
									/>
								</CarouselItem>
							))}
						</CarouselContent>
						{hasSeveral && (
							<>
								<CarouselPrevious className="left-2" />
								<CarouselNext className="right-2" />
							</>
						)}
					</Carousel>
				</DialogContent>
			</Dialog>
		</>
	);
}
