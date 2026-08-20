'use client';

import { Trash2Icon } from 'lucide-react';
import { useActionState, useEffect } from 'react';

import { deletePlace, type PlaceFormState } from '@/app/places/actions';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { showFlash } from '@/components/flash-toast';
import { Button } from '@/components/ui/button';

const initialState: PlaceFormState = null;

interface DeletePlaceButtonProps {
	placeId: string;
	placeName: string;
}

export function DeletePlaceButton({
	placeId,
	placeName
}: DeletePlaceButtonProps) {
	const action = (prevState: PlaceFormState, formData: FormData) =>
		deletePlace(placeId, prevState, formData);
	const [state, formAction, pending] = useActionState(action, initialState);

	// Only the error case reaches this `state`: on success the action
	// redirects (see its comment), which never resolves `state` to "ok" —
	// that toast is carried by the URL and shown by FlashToast on the
	// listing page. Toasting is a side effect on an external system (the
	// toast manager), so it belongs in an effect, not in the render body.
	useEffect(() => {
		if (state && !state.ok) {
			showFlash('place-delete-error');
		}
	}, [state]);

	return (
		<AlertDialog>
			<AlertDialogTrigger
				render={
					<Button variant="destructive">
						<Trash2Icon />
						Eliminar
					</Button>
				}
			/>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						¿Eliminar «{placeName}»?
					</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción no se puede deshacer. Se borrará el sitio y
						toda su información.
					</AlertDialogDescription>
				</AlertDialogHeader>

				{/*
					AlertDialogAction is a plain Button under the hood (unlike
					AlertDialogCancel, it doesn't auto-close) so submitting
					this form on failure leaves the dialog open — the error
					shows up as a toast instead of inline.
				*/}
				<form action={formAction}>
					<AlertDialogFooter>
						<AlertDialogCancel
							render={<Button variant="outline" type="button" />}
						>
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							variant="destructive"
							disabled={pending}
						>
							{pending ? 'Eliminando…' : 'Eliminar'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
