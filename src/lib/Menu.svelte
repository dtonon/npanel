<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
	import { theme, toggleTheme, getEffectiveTheme } from '$lib/theme';
	import { picture } from '$lib/store';
	import { clearSession } from '$lib/actions';
	import { pool } from '@nostr/gadgets/global';

	export let selectedItem = 'Profile';
	let showMobileMenu = false;

	$: effectiveTheme = getEffectiveTheme($theme);

	const menuItems = [
		{ id: 'profile', label: 'Profile', path: '/profile' },
		{ id: 'bunkers', label: 'Bunkers', path: '/bunkers' },
		{ id: 'relays', label: 'Relays', path: '/relays' },
		{ id: 'backup', label: 'Backup key', path: '/backup' }
	];

	function handleMenuClick(item: { id: string; label: string; path: string }) {
		selectedItem = item.id;
		showMobileMenu = false;
		goto(item.path);
	}

	function handleLogout() {
		// disconnect from all relays because we may have authenticated to any and we must reset that
		for (let [url] of pool.listConnectionStatus()) {
			pool.close([url]);
		}
		clearSession();
		goto('/');
	}

	function toggleMobileMenu() {
		showMobileMenu = !showMobileMenu;
	}

	// Lock body scroll when mobile menu is open
	$: if (typeof document !== 'undefined') {
		if (showMobileMenu) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	}
</script>

<svelte:window />

<!-- Hamburger menu button - mobile only -->
<button
	class="absolute right-4 top-4 z-50 flex h-10 w-10 flex-col items-center justify-center space-y-1 rounded-md bg-transparent sm:hidden"
	on:click={toggleMobileMenu}
	aria-label="Toggle menu"
>
	{#if !showMobileMenu}
		<!-- Hamburger Icon -->
		<span class="block h-0.5 w-6 bg-neutral-700 transition-all dark:bg-neutral-100"></span>
		<span class="block h-0.5 w-6 bg-neutral-700 transition-all dark:bg-neutral-100"></span>
		<span class="block h-0.5 w-6 bg-neutral-700 transition-all dark:bg-neutral-100"></span>
	{:else}
		<!-- X Icon -->
		<span class="block h-0.5 w-7 rotate-45 bg-neutral-700 transition-all dark:bg-neutral-100"
		></span>
		<span
			class="block h-0.5 w-7 -translate-y-[6px] -rotate-45 bg-neutral-700 transition-all dark:bg-neutral-100"
		></span>
	{/if}
</button>

<!-- Mobile full-screen menu -->
{#if showMobileMenu}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center bg-white dark:bg-neutral-800 sm:hidden"
		transition:fade={{ duration: 200 }}
	>
		<div
			class="flex h-full w-full flex-col items-center justify-center gap-12 text-center"
			transition:fly={{ y: 20, duration: 300, delay: 100 }}
		>
			{#each menuItems as item}
				<button
					class="text-3xl font-medium text-neutral-700 transition-colors hover:text-accent dark:text-neutral-100"
					class:text-accent={selectedItem === item.id}
					on:click={() => handleMenuClick(item)}
				>
					{item.label}
				</button>
			{/each}

			<div></div>
			<button
				class="flex items-center gap-3 text-3xl font-medium text-neutral-700 transition-colors hover:text-accent dark:text-neutral-100"
				on:click={handleLogout}
			>
				Logout
			</button>
			<div></div>
			<!-- Theme toggle button for mobile -->
			<button
				on:click={() => {
					toggleTheme();
					showMobileMenu = false;
				}}
				class="flex items-center gap-3 text-3xl font-medium text-neutral-700 transition-colors hover:text-accent dark:text-neutral-100"
				aria-label="Toggle theme"
			>
				{#if effectiveTheme === 'dark'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="5" />
						<line x1="12" y1="1" x2="12" y2="3" />
						<line x1="12" y1="21" x2="12" y2="23" />
						<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
						<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
						<line x1="1" y1="12" x2="3" y2="12" />
						<line x1="21" y1="12" x2="23" y2="12" />
						<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
						<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
					</svg>
				{/if}
			</button>
		</div>
	</div>
{/if}

<!-- Desktop menu - hidden on mobile -->
<div class="hidden leading-5 text-neutral-700 dark:text-neutral-100 sm:block sm:w-[90%]">
	<!-- menu -->
	<div class="">
		{#each menuItems as item}
			<div
				class={`mb-4 rounded-md border-b-2 border-l-2  px-4 py-2 hover:cursor-pointer hover:text-accent
				${
					selectedItem === item.id
						? 'border-neutral-600 dark:border-neutral-500'
						: 'border-neutral-400 dark:border-neutral-600'
				}`}
				on:click={() => handleMenuClick(item)}
				on:keydown={(e) => e.key === 'Enter' && handleMenuClick(item)}
				role="button"
				tabindex="0"
			>
				{item.label}
			</div>
		{/each}
	</div>

	<div class="mt-40">
		<div
			class="mb-4 flex flex-row gap-2 rounded-md border-b-2 border-l-2 border-neutral-400 px-4 py-2 hover:cursor-pointer hover:text-accent dark:border-neutral-600"
			on:click={handleLogout}
			on:keydown={(e) => e.key === 'Enter' && handleLogout()}
			role="button"
			tabindex="0"
		>
			Logout <span
				class="h-5 w-5 rounded-full bg-cover"
				style="background-image: url({$picture || '/icons/pfp.svg'})"
			></span>
		</div>
	</div>
</div>
