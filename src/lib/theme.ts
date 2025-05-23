// $lib/theme.ts
import { browser } from '$app/environment';
import { createLocalWritable } from './store';

export const theme = createLocalWritable('theme', ''); // Empty = system

// Theme toggle functionality
let systemTheme: string = 'light';
let mediaQuery: MediaQueryList | undefined;

if (browser) {
	mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	systemTheme = mediaQuery.matches ? 'dark' : 'light';

	// Listen for system theme changes
	mediaQuery.addEventListener('change', (e: MediaQueryListEvent) => {
		systemTheme = e.matches ? 'dark' : 'light';
	});
}

export function toggleTheme(): void {
	theme.update((currentTheme: string) => {
		const effectiveTheme = currentTheme || systemTheme;

		if (effectiveTheme === systemTheme) {
			// If synced with system, switch to opposite
			return systemTheme === 'dark' ? 'light' : 'dark';
		} else {
			// If not synced, go back to system theme (empty string)
			return '';
		}
	});
}

// Helper function to get the effective theme (for components that need to know current theme)
export function getEffectiveTheme(themeValue: string): string {
	return themeValue || systemTheme;
}
