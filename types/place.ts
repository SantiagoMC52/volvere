export type WouldReturn = 'yes' | 'no' | 'maybe';

export interface PlaceImage {
	id: string;
	// Object key inside the place-images bucket. Kept next to the URL because
	// the URL is a short-lived signature and can't identify the object once it
	// expires.
	path: string;
	url: string;
}

export interface Place {
	id: string;
	name: string;
	description: string;
	location?: string;
	phone?: string;
	phoneSecondary?: string;
	url?: string;
	wouldReturn: WouldReturn;
	createdAt: string;
}
