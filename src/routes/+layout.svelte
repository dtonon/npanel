<script lang="ts">
	import '../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { theme } from '$lib/store';
	import ThemeSwitcher from '$lib/ThemeSwitcher.svelte';

	let mediaQuery: MediaQueryList | null = null;
	let systemTheme: string | null = null;

	$: updateTheme($theme);

	onMount(async () => {
		if (browser) {
			mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			systemTheme = mediaQuery.matches ? 'dark' : 'light';

			if (!$theme) {
				$theme = systemTheme;
			}

			// Listen for theme updates from parent window
			window.addEventListener('message', handleThemeUpdate);
		}
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('message', handleThemeUpdate);
		}
	});

	function updateTheme(preferredTheme: string) {
		if (!browser) return;

		const themeToApply =
			preferredTheme === 'system'
				? systemTheme || (mediaQuery?.matches ? 'dark' : 'light')
				: preferredTheme;

		if (themeToApply === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}

	function handleThemeUpdate(event: MessageEvent) {
		if (event.data.type === 'THEME_UPDATE') {
			systemTheme = event.data.systemTheme;
			const configuredTheme = event.data.configuredTheme;

			if (configuredTheme === 'system') {
				$theme = systemTheme || 'light';
			} else {
				$theme = configuredTheme;
			}
		}
	}
</script>

<div class="absolute right-4 top-4 z-50 flex items-center gap-3">
	<ThemeSwitcher />
</div>

<slot />
