'use client';

import { useActionState, useState } from 'react';

import { createPlace, type CreatePlaceState } from '@/app/places/actions';
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
import type { WouldReturn } from '@/types/place';

const WOULD_RETURN_OPTIONS: WouldReturn[] = ['yes', 'no', 'maybe'];

const initialState: CreatePlaceState = null;

export function AddPlaceDialog() {
	const [open, setOpen] = useState(false);
	const [state, formAction, pending] = useActionState(
		createPlace,
		initialState
	);

	// Close the dialog once the action succeeds. Adjusting state during render
	// (vs. a useEffect) avoids an extra commit; the dialog unmounts on close,
	// so the form comes back empty next time without a manual reset.
	const [handledState, setHandledState] = useState(state);
	if (state !== handledState) {
		setHandledState(state);
		if (state && 'ok' in state) {
			setOpen(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button>+ Añadir sitio</Button>} />
			<DialogContent className="sm:max-w-md">
				<form action={formAction} className="flex flex-col gap-4">
					<DialogHeader>
						<DialogTitle>Añadir sitio</DialogTitle>
						<DialogDescription>
							Guarda un restaurante o sitio para recordar si
							volver.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="name">Nombre</Label>
						<Input id="name" name="name" required />
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="description">Descripción</Label>
						<Textarea
							id="description"
							name="description"
							rows={3}
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="location">Ubicación</Label>
						<Input id="location" name="location" />
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="phone">Teléfono</Label>
						<Input id="phone" name="phone" type="tel" />
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="url">URL</Label>
						<Input
							id="url"
							name="url"
							type="url"
							placeholder="https://…"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="wouldReturn">¿Volverías?</Label>
						<Select name="wouldReturn" required>
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
							{pending ? 'Guardando…' : 'Guardar'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
