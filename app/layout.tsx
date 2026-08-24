import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

import { getUser } from '@/lib/supabase/server';
import { VolvereMark } from '@/components/icons/volvere';
import { Toaster } from '@/components/ui/toast';
import { UserMenu } from '@/components/user-menu';

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

	// `user_metadata` is untyped JSON. Google fills both keys on sign-in, but
	// nothing guarantees it, so treat them as optional.
	const { full_name: name, avatar_url: avatarUrl } = (user?.user_metadata ??
		{}) as {
		full_name?: string;
		avatar_url?: string;
	};

	return (
		<html
			lang="es"
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col">
				{user && (
					<header className="flex items-center justify-between gap-4 px-4 pt-6 pb-4 sm:px-8 sm:pt-8">
						<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
							<Link
								href="/"
								className="focus-visible:ring-ring/50 flex items-center gap-2.5 rounded-sm outline-none transition-opacity hover:opacity-70 focus-visible:ring-3"
							>
								<VolvereMark className="size-7 shrink-0 sm:size-8" />
								Volveré
							</Link>
						</h1>

						<UserMenu
							// Typed optional, but Google always returns an email.
							email={user.email ?? ''}
							name={name}
							avatarUrl={avatarUrl}
						/>
					</header>
				)}

				{children}
				<Toaster />
			</body>
		</html>
	);
}
