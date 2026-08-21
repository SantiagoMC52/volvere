// Phone numbers are stored as digits only — no spaces, separators or country
// prefix. The form strips anything else as it is typed; the Server Action
// checks the same rule as a backstop against a hand-made POST.

export function digitsOnly(value: string): string {
	return value.replace(/\D/g, '');
}

export function isDigitsOnly(value: string): boolean {
	return /^\d+$/.test(value);
}
