'use client';

import { PencilIcon } from 'lucide-react';
import {
	startTransition,
	useActionState,
	useCallback,
	useEffect,
	useRef,
	useState,
	type ChangeEvent,
	type SubmitEvent
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
import {
	DESCRIPTION_MAX,
	LOCATION_MAX,
	NAME_MAX,
	PHONE_MAX_DIGITS,
	PHONE_MIN_DIGITS,
	URL_MAX
} from '@/lib/place-limits';
import { digitsOnly } from '@/lib/phone';
import { removeUploadedImages, uploadPlaceImages } from '@/lib/upload-images';
import { WOULD_RETURN_VALUES, wouldReturnLabel } from '@/lib/would-return';
import type { Place, PlaceImage, WouldReturn } from '@/types/place';

const initialState: PlaceFormState = null;

// A name rarely goes near 50 characters, so its counter stays out of the way
// until the limit is close enough to matter.
const NAME_COUNTER_FROM = NAME_MAX - 10;

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

// The form's values as one comparable string. Trimmed, like the Server Action
// trims. `wouldReturn` is left out and compared from state instead: Base UI
// writes it into its hidden input after this has already run, so reading it
// here would always be one selection behind.
function serializeFields(form: HTMLFormElement) {
	return JSON.stringify(
		[...new FormData(form)]
			.filter(([name]) => name !== 'wouldReturn')
			.map(([name, value]) => [name, String(value).trim()])
	);
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
	// open/close edge. Same for the description counter: the `key` remounts
	// the form, not this component, so its state would otherwise still be
	// showing the length of whatever was typed last time.
	const [picked, setPicked] = useState<PickedImage[]>(() =>
		toPickedImages(images)
	);
	const [nameLength, setNameLength] = useState(() => place?.name.length ?? 0);
	const [descriptionLength, setDescriptionLength] = useState(
		() => place?.description.length ?? 0
	);

	// Editing something and changing nothing is not a save, so the button stays
	// dead until the form differs from the values it opened with — compared as
	// a snapshot rather than by controlling every field, which the `key` on the
	// <form> below deliberately rules out.
	const [fieldsDirty, setFieldsDirty] = useState(false);
	const initialValues = useRef<string | null>(null);

	// Taken from the mounted form rather than from `place`, so it starts from
	// the values as rendered: the phone field strips the separators out of an
	// older number, and that is not an edit the user made.
	//
	// `useCallback` is load-bearing here. React reinvokes a ref callback
	// whenever its identity changes, so an inline arrow would retake the
	// snapshot on the very re-render that marking the form dirty causes, and
	// the button would never go back to disabled.
	const captureInitialValues = useCallback((form: HTMLFormElement | null) => {
		initialValues.current = form && serializeFields(form);
	}, []);

	// The one field that has to be controlled anyway. Base UI writes the
	// select's value into a hidden input from React, which fires no `input`
	// event for the form-level listener below to catch, so its value is held
	// here and compared on its own.
	const [wouldReturn, setWouldReturn] = useState<WouldReturn | null>(
		() => place?.wouldReturn ?? null
	);

	const [lastOpen, setLastOpen] = useState(open);
	if (open !== lastOpen) {
		setLastOpen(open);
		if (open) {
			setPicked(toPickedImages(images));
			setNameLength(place?.name.length ?? 0);
			setDescriptionLength(place?.description.length ?? 0);
			setFieldsDirty(false);
			setWouldReturn(place?.wouldReturn ?? null);
		}
	}

	// Uploading happens before the action is dispatched, so `pending` doesn't
	// cover it and the button has to watch both. Compressing a photo comes
	// even earlier — it starts when the file is picked — and it has to block
	// the save too: those photos are not in `picked` until it finishes.
	const [processingImages, setProcessingImages] = useState(false);
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
	//
	// Deliberately `onSubmit` and not `<form action>`: React asks the form to
	// reset the moment an action is dispatched through it, before that action
	// even runs, so any failed save wiped every field the user had typed.
	// Dispatching by hand keeps them; the form still starts clean on reopen,
	// because the `key` below remounts it.
	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		// Read before the first await: React clears `currentTarget` once the
		// handler returns.
		const formData = new FormData(event.currentTarget);

		// An edit reuses the place's id; a new place needs one now, because
		// the upload path contains it. Generated here rather than in state so
		// it can't differ between the server and client renders.
		const placeId = place?.id ?? crypto.randomUUID();
		const blobs = picked.flatMap(image =>
			image.kind === 'new' ? [image.blob] : []
		);

		let uploaded: string[] = [];
		if (blobs.length > 0) {
			setUploading(true);
			try {
				uploaded = await uploadPlaceImages(placeId, blobs);
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

		// `formAction` has to run inside a transition for `pending` to flip to
		// true — nothing opened one here, since the submit is handled by hand.
		startTransition(() => {
			formAction(formData);
		});
	}

	const busy = processingImages || uploading || pending;

	// The photos never travel in the form — they are uploaded separately and
	// only their keys are appended on submit — so they compare on their own.
	const imagesDirty =
		picked.length !== images.length ||
		picked.some(
			(image, index) =>
				image.kind === 'new' || image.path !== images[index]?.path
		);

	// Adding a place is always saveable; there is nothing to compare against.
	const dirty =
		!place ||
		fieldsDirty ||
		imagesDirty ||
		wouldReturn !== place.wouldReturn;

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
			{/*
				`p-0` moves the padding onto the three bands below, so the
				scroll container is the fields band alone. Scrolling the popup
				itself instead would leave its bottom padding as scrollable
				area under a sticky footer, and the content shows through
				there.
			*/}
			<DialogContent className="flex flex-col overflow-hidden p-0 sm:max-w-md">
				{/*
					`key` forces a remount on every open/close so the
					uncontrolled inputs below always initialize from the
					current `place`. Without this, saving an edit revalidates
					the page and hands this dialog a new `place` while its
					inputs are still mounted with the old `defaultValue` —
					which Base UI's Input flags as an uncontrolled-field
					warning. It is also what empties the form after a save,
					now that the submit no longer goes through the `action`
					prop that used to reset it.
				*/}
				<form
					key={String(open)}
					ref={captureInitialValues}
					onInput={event =>
						setFieldsDirty(
							serializeFields(event.currentTarget) !==
								initialValues.current
						)
					}
					onSubmit={event => void handleSubmit(event)}
					className="flex min-h-0 flex-col"
				>
					<DialogHeader className="shrink-0 p-4 pb-0">
						<DialogTitle>
							{place ? 'Editar sitio' : 'Añadir sitio'}
						</DialogTitle>
						<DialogDescription>
							Guarda un restaurante o sitio para recordar si
							volver.
						</DialogDescription>
					</DialogHeader>

					{/* `min-h-0` is what lets this shrink below its content
					    height so the overflow actually scrolls — without it a
					    flex item floors at its intrinsic size. */}
					<div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
						<div className="flex flex-col gap-1.5">
							<div className="flex items-baseline justify-between gap-2">
								<Label htmlFor="name">Nombre</Label>
								{/*
									Always in the DOM, only its content is
									conditional: a live region that appears at
									the same moment as its text goes unread.
								*/}
								<span
									aria-live="polite"
									className="text-muted-foreground text-xs"
								>
									{nameLength >= NAME_COUNTER_FROM &&
										`${nameLength}/${NAME_MAX}`}
								</span>
							</div>
							<Input
								id="name"
								name="name"
								maxLength={NAME_MAX}
								onChange={event =>
									setNameLength(
										event.currentTarget.value.length
									)
								}
								defaultValue={place?.name}
								required
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							{/* The only counter always on: this is the field long
								enough that running out of room is a surprise. */}
							<div className="flex items-baseline justify-between gap-2">
								<Label htmlFor="description">Descripción</Label>
								<span className="text-muted-foreground text-xs">
									{descriptionLength}/{DESCRIPTION_MAX}
								</span>
							</div>
							<Textarea
								id="description"
								name="description"
								rows={3}
								maxLength={DESCRIPTION_MAX}
								onChange={event =>
									setDescriptionLength(
										event.currentTarget.value.length
									)
								}
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
								maxLength={LOCATION_MAX}
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
								// `minLength` only bites once something has been
								// typed, so an empty field stays valid — the
								// phone is optional.
								minLength={PHONE_MIN_DIGITS}
								maxLength={PHONE_MAX_DIGITS}
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
								maxLength={URL_MAX}
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
								value={wouldReturn}
								onValueChange={setWouldReturn}
							>
								<SelectTrigger
									id="wouldReturn"
									className="w-full"
								>
									<SelectValue placeholder="Selecciona una opción" />
								</SelectTrigger>
								<SelectContent>
									{WOULD_RETURN_VALUES.map(value => (
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
							processing={processingImages}
							onProcessingChange={setProcessingImages}
							disabled={busy}
						/>
					</div>

					<DialogFooter className="mx-0 mb-0 shrink-0">
						<DialogClose
							render={
								<Button variant="outline" type="button">
									Cancelar
								</Button>
							}
						/>
						<Button type="submit" disabled={busy || !dirty}>
							{processingImages
								? 'Procesando fotos…'
								: uploading
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
