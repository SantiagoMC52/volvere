import type { ComponentProps } from 'react';

export function VolvereMark(props: ComponentProps<'svg'>) {
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			viewBox="0 0 32 32"
			{...props}
		>
			<rect width="32" height="32" rx="7" className="fill-primary" />
			<g
				fill="none"
				strokeWidth="3.2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="stroke-primary-foreground"
			>
				<path d="M24 9 16 24 8 9" />
				<path d="M12.5 11.2 8 9l-.7 5" />
			</g>
		</svg>
	);
}
