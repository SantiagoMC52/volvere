'use client';

import { PencilIcon } from 'lucide-react';
import { useActionState, useState } from 'react';

import {
	createPlace,
	updatePlace,
	type PlaceFormState
} from '@/app/places/actions';
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
import { wouldReturnLabel } from '@/lib/would-return';
import type { Place, WouldReturn } from '@/types/place';

const WOULD_RETURN_OPTIONS: WouldReturn[] = ['yes', 'no', 'maybe'];

const initialState: PlaceFormState = null;

interface PlaceFormDialogProps {
	// Place to edit; omit to render the "add" flow instead.
	place?: Place;
}

export function PlaceFormDialog({ place }: PlaceFormDialogProps) {
	const [open, setOpen] = useState(false);
	const action = place
		? (prevState: PlaceFormState, formData: FormData) =>
				updatePlace(place.id, prevState, formData)
		: createPlace;
	const [state, formAction, pending] = useActionState(action, initialState);

	// Close the dialog once the action succeeds. Adjusting state during render
	// (vs. a useEffect) avoids an extra commit; the form below is keyed on
	// `open` so it remounts fresh from `place` every time it opens (see the
	// `key` on the <form>).
	const [handledState, setHandledState] = useState(state);
	if (state !== handledState) {
		setHandledState(state);
		if (state && 'ok' in state) {
			setOpen(false);
		}
	}

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
					action={formAction}
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
						<Input
							id="location"
							name="location"
							defaultValue={place?.location}
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="phone">Teléfono</Label>
						<Input
							id="phone"
							name="phone"
							type="tel"
							defaultValue={place?.phone}
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

					{state && 'error' in state && (
						<p role="alert" className="text-destructive text-sm">
							{state.error}
						</p>
					)}

					<DialogFooter>
						<DialogClose
							render={
								<Button variant="outline" type="button">
									Cancelar
								</Button>
							}
						/>
						<Button type="submit" disabled={pending}>
							{pending
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
