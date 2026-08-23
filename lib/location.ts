// The location field is free text: it holds either an address typed by hand or
// a link pasted from a maps app. Both are shown as a link to a map — a pasted
// link opens as it is, an address goes through a Maps search.

const MAPS_SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=';

export interface LocationLink {
	href: string;
	label: string;
}

// Only an explicit http(s) URL counts as a link. Anything else — including a
// javascript: or data: value from a hand-made POST — falls through to the
// search branch, where it is just an encoded query string.
function isHttpUrl(value: string): boolean {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return false;
	}

	return url.protocol === 'http:' || url.protocol === 'https:';
}

export function toLocationLink(location: string): LocationLink {
	// A maps URL is unreadable as link text (`maps.app.goo.gl/ueDxacb…`), so
	// unlike the web field it isn't shown stripped of its scheme — it is
	// replaced by what it does.
	return isHttpUrl(location)
		? { href: location, label: 'Ver en el mapa' }
		: {
				href: `${MAPS_SEARCH_URL}${encodeURIComponent(location)}`,
				label: location
			};
}
