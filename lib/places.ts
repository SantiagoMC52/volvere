export type WouldReturn = 'yes' | 'no' | 'maybe';

export interface Place {
	id: string;
	name: string;
	description: string;
	location?: string;
	phone?: string;
	url?: string;
	wouldReturn: WouldReturn;
}

export const wouldReturnLabel: Record<WouldReturn, string> = {
	yes: '👍 Sí volvería',
	no: '👎 No volvería',
	maybe: '🤔 Tal vez'
};

// Datos de prueba. Esto se sustituirá por consultas a Supabase más adelante,
// pero las funciones de abajo (getPlaces / getPlaceById) mantienen la misma
// forma que tendrán entonces, para que el cambio sea sencillo.
const places: Place[] = [
	{
		id: 'casa-pepe',
		name: 'Casa Pepe',
		description:
			'Bar de tapas de toda la vida. Pedimos las croquetas de jamón y la tortilla: las croquetas espectaculares, la tortilla un poco sosa. Volveríamos solo por las croquetas.',
		location: 'Calle Mayor 12, Madrid',
		phone: '+34 912 345 678',
		url: 'https://casapepe.example.com',
		wouldReturn: 'yes'
	}
];

export function getPlaces(): Place[] {
	return places;
}

export function getPlaceById(id: string): Place | undefined {
	return places.find(place => place.id === id);
}
