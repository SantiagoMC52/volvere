'use client';

import { PencilIcon } from 'lucide-react';
import {
	startTransition,
	useActionState,
	useEffect,
	useRef,
	useState,
	type ChangeEvent
} from 'react';

import {
	createPlace,
	updatePlace,
	type PlaceFormState
} from '@/app/places/actions';
import { showFlash } from '@/components/flash-toast';
import {
	PlaceImagesField,
	toPickedImages,
	type PickedImage
} from '@/components/places/place-images-field';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { digitsOnly } from '@/lib/phone';
import { removeUploadedImages, uploadPlaceImages } from '@/lib/upload-images';
import { wouldReturnLabel } from '@/lib/would-return';
import type { Place, PlaceImage, WouldReturn } from '@/types/place';

const WOULD_RETURN_OPTIONS: WouldReturn[] = ['yes', 'no', 'maybe'];

const initialState: PlaceFormState = null;

// Keeps the phone field to digits, whether they were typed, pasted or dropped
// in. The input stays uncontrolled like the rest of the form, so the value is
// rewritten in place; the caret then goes back to however many digits preceded
// it, which is where the user was typing.
function keepDigitsOnly(event: ChangeEvent<HTMLInputElement>) {
	const input = event.currentTarget;
	const { value } = input;
	const digits = digitsOnly(value);

	if (digits === value) {
		return;
	}

	const caret = digitsOnly(
		value.slice(0, input.selectionStart ?? value.length)
	).length;

	input.value = digits;
	input.setSelectionRange(caret, caret);
}

interface PlaceFormDialogProps {
	// Place to edit; omit to render the "add" flow instead.
	place?: Place;
	// Photos already stored for `place`. Only meaningful when editing.
	images?: PlaceImage[];
}

export function PlaceFormDialog({ place, images = [] }: PlaceFormDialogProps) {
	const [open, setOpen] = useState(false);
	const action = place
		? (prevState: PlaceFormState, formData: FormData) =>
				updatePlace(place.id, prevState, formData)
		: createPlace;
	const [state, formAction, pending] = useActionState(action, initialState);

	// The text fields are uncontrolled and reset via the <form> `key` below,
	// but the photo list is state, so it needs resetting on the same
	// open/close edge.
	const [picked, setPicked] = useState<PickedImage[]>(() =>
		toPickedImages(images)
	);
	const [lastOpen, setLastOpen] = useState(open);
	if (open !== lastOpen) {
		setLastOpen(open);
		if (open) {
			setPicked(toPickedImages(images));
		}
	}

	// Uploading happens before the action is dispatched, so `pending` doesn't
	// cover it and the button has to watch both.
	const [uploading, setUploading] = useState(false);
	// Keys written by the submit in flight, to clean up if the action fails.
	const uploadedRef = useRef<string[]>([]);

	// Close the dialog once the action succeeds. Adjusting state during render
	// (vs. a useEffect) avoids an extra commit; the form below is keyed on
	// `open` so it remounts fresh from `place` every time it opens (see the
	// `key` on the <form>).
	const [handledState, setHandledState] = useState(state);
	if (state !== handledState) {
		setHandledState(state);
		// Leave it open on failure so the user can retry without retyping.
		if (state?.ok) {
			setOpen(false);
		}
	}

	// Plain strings rather than `place` itself in the effect's deps: their
	// values are stable across the re-render an edit triggers, so the toast
	// isn't replayed when a new `place` object arrives.
	const successFlash = place ? 'place-updated' : 'place-created';
	const errorFlash = place ? 'place-update-error' : 'place-create-error';

	// Toasting is a side effect on an external system (the toast manager),
	// so unlike the state adjustment above it belongs in an effect. Both
	// actions finish on this page, so the toast can fire directly here —
	// no need for the redirect-surviving flash in lib/flash.ts.
	useEffect(() => {
		if (!state) {
			return;
		}

		showFlash(state.ok ? successFlash : errorFlash);

		// The photos reached Storage but no row points at them. The picked
		// files are still in state, so retrying uploads them again.
		if (!state.ok) {
			void removeUploadedImages(uploadedRef.current);
		}
		uploadedRef.current = [];
	}, [state, successFlash, errorFlash]);

	// Wraps the action: the photos have to be in Storage first, since all the
	// Server Action receives is their object keys.
	async function handleSubmit(formData: FormData) {
		// An edit reuses the place's id; a new place needs one now, because
		// the upload path contains it. Generated here rather than in state so
		// it can't differ between the server and client renders.
		const placeId = place?.id ?? crypto.randomUUID();
		const files = picked.flatMap(image =>
			image.kind === 'new' ? [image.file] : []
		);

		let uploaded: string[] = [];
		if (files.length > 0) {
			setUploading(true);
			try {
				uploaded = await uploadPlaceImages(placeId, files);
			} catch (err) {
				console.error('[places] image upload failed:', err);
				showFlash('image-upload-error');
				return;
			} finally {
				setUploading(false);
			}
		}
		uploadedRef.current = uploaded;

		// Walk `picked`, not the two lists separately: it carries the order
		// shown on screen, which is the order the photos are saved in.
		let next = 0;
		for (const image of picked) {
			formData.append(
				'imagePaths',
				image.kind === 'stored' ? image.path : uploaded[next++]
			);
		}
		formData.set('id', placeId);

		// React opens a transition around a <form action>, but awaiting the
		// upload steps outside it: without reopening one, `pending` never
		// flips to true.
		startTransition(() => {
			formAction(formData);
		});
	}

	const busy = uploading || pending;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					place ? (
						<Button variant="outline">
							<PencilIcon />
							Editar
						</Button>
					) : (
						<Button>+ Añadir sitio</Button>
					)
				}
			/>
			<DialogContent className="sm:max-w-md">
				{/*
					`key` forces a remount on every open/close so the
					uncontrolled inputs below always initialize from the
					current `place`. Without this, saving an edit revalidates
					the page and hands this dialog a new `place` while its
					inputs are still mounted with the old `defaultValue` —
					which Base UI's Input flags as an uncontrolled-field
					warning.
				*/}
				<form
					key={String(open)}
					action={handleSubmit}
					className="flex flex-col gap-4"
				>
					<DialogHeader>
						<DialogTitle>
							{place ? 'Editar sitio' : 'Añadir sitio'}
						</DialogTitle>
						<DialogDescription>
							Guarda un restaurante o sitio para recordar si
							volver.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="name">Nombre</Label>
						<Input
							id="name"
							name="name"
							defaultValue={place?.name}
							required
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="description">Descripción</Label>
						<Textarea
							id="description"
							name="description"
							rows={3}
							defaultValue={place?.description}
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="location">Ubicación</Label>
						{/* Deliberately not type="url": an address typed by
						    hand is as valid here as a pasted link. */}
						<Input
							id="location"
							name="location"
							placeholder="Dirección o enlace de Google Maps"
							defaultValue={place?.location}
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="phone">Teléfono</Label>
						<Input
							id="phone"
							name="phone"
							type="tel"
							inputMode="numeric"
							// Backstop for the rare case the change handler
							// never runs (autofill on submit, no JS).
							pattern="[0-9]*"
							onChange={keepDigitsOnly}
							// A number saved before this rule could still
							// carry separators; drop them so an edit doesn't
							// start out invalid.
							defaultValue={
								place?.phone && digitsOnly(place.phone)
							}
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="url">URL</Label>
						<Input
							id="url"
							name="url"
							type="url"
							placeholder="https://…"
							defaultValue={place?.url}
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="wouldReturn">¿Volverías?</Label>
						<Select
							name="wouldReturn"
							required
							items={wouldReturnLabel}
							defaultValue={place?.wouldReturn}
						>
							<SelectTrigger id="wouldReturn" className="w-full">
								<SelectValue placeholder="Selecciona una opción" />
							</SelectTrigger>
							<SelectContent>
								{WOULD_RETURN_OPTIONS.map(value => (
									<SelectItem key={value} value={value}>
										{wouldReturnLabel[value]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<PlaceImagesField
						images={picked}
						onChange={setPicked}
						disabled={busy}
					/>

					<DialogFooter>
						<DialogClose
							render={
								<Button variant="outline" type="button">
									Cancelar
								</Button>
							}
						/>
						<Button type="submit" disabled={busy}>
							{uploading
								? 'Subiendo fotos…'
								: pending
									? 'Guardando…'
									: place
										? 'Guardar cambios'
										: 'Guardar'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
