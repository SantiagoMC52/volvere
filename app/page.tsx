import Link from 'next/link';

import { signOut } from '@/app/login/actions';
import { getPlaces, wouldReturnLabel } from '@/lib/places';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
	const places = getPlaces();
	const supabase = await createClient();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	return (
		<div className="flex flex-1 flex-col gap-6 p-8">
			<div className="flex items-center justify-between gap-4">
				<h1 className="text-3xl font-semibold tracking-tight">
					Volveré
				</h1>

				{user && (
					<form action={signOut} className="flex items-center gap-3">
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
				)}
			</div>

			<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{places.map(place => (
					<li key={place.id}>
						<Link
							href={`/places/${place.id}`}
							className="border-border hover:bg-muted block rounded-lg border p-4 transition-colors"
						>
							<h2 className="font-medium">{place.name}</h2>
							<p className="text-muted-foreground text-sm">
								{wouldReturnLabel[place.wouldReturn]}
							</p>
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}
