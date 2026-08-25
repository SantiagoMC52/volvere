// Also enforced by lib/place-schema.ts and by check constraints on
// public.places. Kept apart from the schema so the form can read them without
// pulling Zod into the browser bundle.

export const NAME_MAX = 50;
export const DESCRIPTION_MAX = 400;

// Sized for a pasted Google Maps URL, not for a typed street name.
export const LOCATION_MAX = 500;
export const URL_MAX = 500;

// Digits only, no country prefix — see lib/phone.ts. 15 is the E.164 maximum,
// so a place saved abroad still fits.
export const PHONE_MIN_DIGITS = 6;
export const PHONE_MAX_DIGITS = 15;
