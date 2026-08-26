// Formatting happens on the server, so the zone has to be spelled out: the
// host runs in UTC, and a place saved late in the evening in Spain would come
// out dated a day early. Fixed to Madrid rather than taken from the browser —
// this is a personal app used from one country, and doing it per viewer means
// moving the work to the client and handling the hydration mismatch that
// server and browser disagreeing would cause.
//
// Built once at module scope: constructing a formatter is the expensive part,
// formatting with it is not.
const PLACE_DATE = new Intl.DateTimeFormat('es-ES', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'Europe/Madrid'
});

// Takes the timestamptz as Postgres returns it.
export function formatDate(value: string): string {
	return PLACE_DATE.format(new Date(value));
}
