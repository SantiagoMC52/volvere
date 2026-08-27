import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	experimental: {
		staleTimes: {
			// Every page reads the session cookie, so all of them count as
			// dynamic and the default of 0 makes the client cache keep
			// nothing — going back to the listing re-queried Supabase for a
			// view the browser had rendered seconds earlier. Safe to reuse
			// because every write in app/places/actions.ts calls
			// revalidatePath, which drops the cached entry straight away.
			dynamic: 30
		}
	}
};

export default nextConfig;
