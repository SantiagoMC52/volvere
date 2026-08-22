'use client';

import { ImagePlusIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, type ChangeEvent } from 'react';

import { showFlash } from '@/components/flash-toast';
import { PlacePhoto } from '@/components/places/place-photo';
import { Label } from '@/components/ui/label';
import {
	ACCEPTED_IMAGE_MIME_TYPES,
	isAcceptedImage,
	MAX_IMAGES_PER_PLACE
} from '@/lib/images';
import type { PlaceImage } from '@/types/place';

// A photo the form is holding on to: already in Storage (edit mode), or
// just picked and still to be compressed and uploaded. `url` is a signed URL
// in the first case and an object URL in the second.
export type PickedImage = { key: string; url: string } & (
	{ kind: 'stored'; path: string } | { kind: 'new'; file: File }
);

export function toPickedImages(images: PlaceImage[]): PickedImage[] {
	return images.map(image => ({
		key: image.id,
		url: image.url,
		kind: 'stored',
		path: image.path
	}));
}

interface PlaceImagesFieldProps {
	images: PickedImage[];
	onChange: (images: PickedImage[]) => void;
	disabled?: boolean;
}

export function PlaceImagesField({
	images,
	onChange,
	disabled
}: PlaceImagesFieldProps) {
	// Object URLs are not garbage collected on their own, so every one this
	// field creates is tracked and released when it unmounts.
	const objectUrls = useRef<string[]>([]);
	useEffect(
		() => () => {
			objectUrls.current.forEach(URL.revokeObjectURL);
		},
		[]
	);

	function handleFiles(event: ChangeEvent<HTMLInputElement>) {
		const picked = Array.from(event.target.files ?? []);
		// Lets the same file be picked again right after removing it —
		// otherwise the value wouldn't change and `onChange` never fires.
		event.target.value = '';

		// `accept` is only a hint: the picker still lets you choose "all
		// files" and hand over a video. Catching it here beats a broken
		// preview and a vague error on save.
		const usable = picked.filter(isAcceptedImage);
		if (usable.length < picked.length) {
			showFlash('image-rejected');
		}

		const room = MAX_IMAGES_PER_PLACE - images.length;
		// Trimmed silently: the counter above already shows the room left.
		const added = usable.slice(0, room).map(file => {
			const url = URL.createObjectURL(file);
			objectUrls.current.push(url);

			return {
				key: crypto.randomUUID(),
				url,
				kind: 'new' as const,
				file
			};
		});

		if (added.length > 0) {
			onChange([...images, ...added]);
		}
	}

	function remove(target: PickedImage) {
		if (target.kind === 'new') {
			URL.revokeObjectURL(target.url);
		}
		onChange(images.filter(image => image.key !== target.key));
	}

	const isFull = images.length >= MAX_IMAGES_PER_PLACE;

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-baseline justify-between gap-2">
				<Label htmlFor="images">Fotos</Label>
				<span className="text-muted-foreground text-xs">
					{images.length}/{MAX_IMAGES_PER_PLACE}
				</span>
			</div>

			<div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
				{images.map(image => (
					<div key={image.key} className="group relative">
						{/* contain, like the gallery: a crop hides which
							poster this is. */}
						<PlacePhoto
							src={image.url}
							alt=""
							className="aspect-square w-full rounded-md"
							imageClassName="size-full object-contain"
						/>
						<button
							type="button"
							onClick={() => remove(image)}
							disabled={disabled}
							aria-label="Quitar foto"
							className="bg-background/80 text-foreground absolute top-1 right-1 rounded-full p-1 backdrop-blur-sm transition-opacity hover:bg-background disabled:opacity-50"
						>
							<XIcon className="size-3.5" />
						</button>
					</div>
				))}

				{!isFull && (
					<Label
						htmlFor="images"
						data-disabled={disabled || undefined}
						className="border-border text-muted-foreground hover:bg-muted flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed transition-colors data-disabled:pointer-events-none data-disabled:opacity-50"
					>
						<ImagePlusIcon className="size-5" />
						<span className="text-xs">Añadir</span>
					</Label>
				)}
			</div>

			{/*
				Deliberately unnamed: these files never travel with the form.
				They go straight to Storage on submit, and only the resulting
				object keys reach the Server Action.
			*/}
			<input
				id="images"
				type="file"
				accept={ACCEPTED_IMAGE_MIME_TYPES.join(',')}
				multiple
				disabled={disabled || isFull}
				onChange={handleFiles}
				className="hidden"
			/>
		</div>
	);
}
