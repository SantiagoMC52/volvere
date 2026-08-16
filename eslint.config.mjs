import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import unusedImports from 'eslint-plugin-unused-imports';

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	{
		plugins: {
			'unused-imports': unusedImports
		},
		rules: {
			// Delegate unused-vars checking to unused-imports, which can also
			// autofix by removing the dead import instead of just warning.
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'unused-imports/no-unused-imports': 'error',
			'unused-imports/no-unused-vars': [
				'warn',
				{
					vars: 'all',
					varsIgnorePattern: '^_',
					args: 'after-used',
					argsIgnorePattern: '^_'
				}
			]
		}
	},
	// Must stay last: turns off ESLint stylistic rules that conflict with
	// Prettier, so both tools don't fight over formatting.
	prettierConfig,
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		'.next/**',
		'out/**',
		'build/**',
		'next-env.d.ts'
	])
]);

export default eslintConfig;
