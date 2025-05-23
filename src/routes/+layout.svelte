<script lang="ts">
	import '../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { theme } from '$lib/theme';
	import ThemeSwitcher from '$lib/ThemeSwitcher.svelte';

	let mediaQuery: MediaQueryList | null = null;
	let systemTheme: string | null = null;

	let isMobile = false;

	$: updateTheme($theme);
	$: isHomepage = $page.url.pathname === '/';
	$: showThemeSwitcher = !isMobile || (isMobile && isHomepage);

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

	onMount(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth <= 768; // or your mobile breakpoint
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);

		return () => window.removeEventListener('resize', checkMobile);
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('message', handleThemeUpdate);
		}
	});

	function updateTheme(preferredTheme: string) {
		if (!browser) return;

		const themeToApply =
			preferredTheme === 'system' || !preferredTheme
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

{#if showThemeSwitcher}
	<div class="absolute right-4 top-4 z-50 flex items-center gap-3">
		<ThemeSwitcher />
	</div>
{/if}

<slot />
