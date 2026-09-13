export type WouldReturn = 'yes' | 'no' | 'maybe';

// Mirrors public.place_category. The list lives in lib/place-category.ts.
export type PlaceCategory =
	'food' | 'lodging' | 'parking' | 'leisure' | 'shopping' | 'other';

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
	category: PlaceCategory;
	createdAt: string;
	// Present only while the place has a public link. It is the credential for
	// that link, so it never leaves the owner's own pages.
	shareToken?: string;
	// Whether that link shows the notes. Only fetched alongside `shareToken`,
	// so it is optional for the same reason.
	shareDescription?: boolean;
}

// What a visitor opening a share link gets to see. Deliberately not a subset
// of `Place` built with Pick: the fields it leaves out are a privacy decision
// enforced by public.get_shared_place, and tying the two together would let a
// change to `Place` silently widen it.
export interface SharedPlace {
	name: string;
	category: PlaceCategory;
	// Only when the owner chose to share the notes — see share_description.
	description?: string;
	location?: string;
	phone?: string;
	phoneSecondary?: string;
	url?: string;
}
