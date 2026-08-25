// Phone numbers are stored as digits only — no spaces, separators or country
// prefix. The form strips anything else as it is typed; lib/place-schema.ts
// checks the same rule, plus a length, as a backstop against a hand-made POST.

export function digitsOnly(value: string): string {
	return value.replace(/\D/g, '');
}
