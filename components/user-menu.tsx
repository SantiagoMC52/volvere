'use client';

import { LogOutIcon } from 'lucide-react';

import { signOut } from '@/app/login/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

type UserMenuProps = {
	email: string;
	name?: string;
	avatarUrl?: string;
};

export function UserMenu({ email, name, avatarUrl }: UserMenuProps) {
	const initial = (name?.trim() || email).charAt(0).toUpperCase();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Menú de la cuenta"
				className="focus-visible:ring-ring/50 cursor-pointer rounded-full outline-none focus-visible:ring-3"
			>
				<Avatar>
					{/* Google serves the profile picture; without it the initial shows. */}
					{avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
					<AvatarFallback>{initial}</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-56">
				<div className="flex flex-col px-1.5 py-1">
					{name && (
						<span className="truncate text-sm font-medium">
							{name}
						</span>
					)}
					<span className="text-muted-foreground truncate text-xs">
						{email}
					</span>
				</div>

				<DropdownMenuSeparator />

				{/* The menu must stay open until signOut redirects: closing it
				    unmounts the button mid-click and the form never submits. */}
				<form action={signOut}>
					<DropdownMenuItem
						closeOnClick={false}
						nativeButton
						variant="destructive"
						render={
							<button
								type="submit"
								className="w-full cursor-pointer"
							/>
						}
					>
						<LogOutIcon />
						Cerrar sesión
					</DropdownMenuItem>
				</form>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
