'use client';

import { ImagePlusIcon, Loader2Icon, XIcon } from 'lucide-react';
import { useEffect, useRef, type ChangeEvent } from 'react';

import { showFlash } from '@/components/flash-toast';
import { PlacePhoto } from '@/components/places/place-photo';
import { Label } from '@/components/ui/label';
import {
	compressImage,
	IMAGE_INPUT_ACCEPT,
	isAcceptedImage,
	MAX_IMAGES_PER_PLACE
} from '@/lib/images';
import type { PlaceImage } from '@/types/place';

// A photo the form is holding on to: already in Storage (edit mode), or just
// picked, already compressed and still to be uploaded. `url` is a signed URL
// in the first case and an object URL in the second.
export type PickedImage = { key: string; url: string } & (
	{ kind: 'stored'; path: string } | { kind: 'new'; blob: Blob }
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
	// Compressing is async and the photos only reach `images` once it finishes,
	// so the form has to know: saving mid-conversion would drop them silently.
	// The parent owns the flag and passes it back as `disabled`.
	processing: boolean;
	onProcessingChange: (processing: boolean) => void;
	disabled?: boolean;
}

export function PlaceImagesField({
	images,
	onChange,
	processing,
	onProcessingChange,
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

	async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
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
		const accepted = usable.slice(0, room);
		if (accepted.length === 0) {
			return;
		}

		// Compressed here rather than on submit: it turns a HEIC into
		// something this browser can actually paint, so the preview below is
		// the stored photo itself, and a file nothing can read is rejected
		// while the user is still looking at the picker.
		onProcessingChange(true);
		const added: PickedImage[] = [];
		let failed = 0;
		try {
			for (const file of accepted) {
				try {
					const blob = await compressImage(file);
					const url = URL.createObjectURL(blob);
					objectUrls.current.push(url);

					added.push({
						key: crypto.randomUUID(),
						url,
						kind: 'new',
						blob
					});
				} catch (err) {
					// One bad file doesn't sink the rest of the batch.
					console.error('[places] image processing failed:', err);
					failed++;
				}
			}
		} finally {
			onProcessingChange(false);
		}

		// One toast for the batch, however many files went wrong.
		if (failed > 0) {
			showFlash('image-process-error');
		}

		if (added.length > 0) {
			// `images` is what it was when the picker closed, which still
			// holds: every control that could change it is disabled while
			// this runs.
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

				{/* A HEIC in a browser without a native decoder takes a few
					seconds, so the tile says what is happening rather than
					just sitting there greyed out. */}
				{!isFull && (
					<Label
						htmlFor="images"
						data-disabled={disabled || undefined}
						className="border-border text-muted-foreground hover:bg-muted flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed transition-colors data-disabled:pointer-events-none data-disabled:opacity-50"
					>
						{processing ? (
							<>
								<Loader2Icon className="size-5 animate-spin" />
								<span className="text-xs">Procesando…</span>
							</>
						) : (
							<>
								<ImagePlusIcon className="size-5" />
								<span className="text-xs">Añadir</span>
							</>
						)}
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
				accept={IMAGE_INPUT_ACCEPT}
				multiple
				disabled={disabled || isFull}
				onChange={event => void handleFiles(event)}
				className="hidden"
			/>
		</div>
	);
}
