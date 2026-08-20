'use client';

import { Trash2Icon } from 'lucide-react';
import { useActionState } from 'react';

import { deletePlace, type DeletePlaceState } from '@/app/places/actions';
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
import { Button } from '@/components/ui/button';

const initialState: DeletePlaceState = null;

interface DeletePlaceButtonProps {
	placeId: string;
	placeName: string;
}

export function DeletePlaceButton({
	placeId,
	placeName
}: DeletePlaceButtonProps) {
	const action = (prevState: DeletePlaceState, formData: FormData) =>
		deletePlace(placeId, prevState, formData);
	const [state, formAction, pending] = useActionState(action, initialState);

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

				{state && 'error' in state && (
					<p role="alert" className="text-destructive text-sm">
						{state.error}
					</p>
				)}

				{/*
					AlertDialogAction is a plain Button under the hood (unlike
					AlertDialogCancel, it doesn't auto-close) so submitting
					this form on failure just re-renders `state.error` above
					with the dialog still open, instead of closing blind.
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
