import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import { signOut } from '@/app/login/actions';
import { getUser } from '@/lib/supabase/server';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin']
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin']
});

export const metadata: Metadata = {
	title: 'Volveré',
	description: 'Restaurantes y sitios para recordar si volver o no.'
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
	const user = await getUser();

	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col">
				{user && (
					<div className="flex items-center justify-between gap-4 p-8 pb-4">
						<h1 className="text-3xl font-semibold tracking-tight">
							Volveré
						</h1>

						<form
							action={signOut}
							className="flex items-center gap-3"
						>
							<span className="text-muted-foreground text-sm">
								{user.email}
							</span>
							<button
								type="submit"
								className="text-muted-foreground text-sm hover:underline cursor-pointer"
							>
								Cerrar sesión
							</button>
						</form>
					</div>
				)}

				{children}
			</body>
		</html>
	);
}
