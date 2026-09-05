import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: 'Volveré',
		short_name: 'Volveré',
		description:
			'Web personal para guardar restaurantes y sitios que quiero recordar — para saber si volver o no.',
		start_url: '/',
		display: 'standalone',
		background_color: '#ffffff',
		theme_color: '#0b6cdd',
		orientation: 'portrait',
		icons: [
			{
				src: '/icons/icon-192.png',
				sizes: '192x192',
				type: 'image/png'
			},
			{
				src: '/icons/icon-512.png',
				sizes: '512x512',
				type: 'image/png'
			},
			{
				src: '/icons/icon-512-maskable.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'maskable'
			}
		]
	};
}
