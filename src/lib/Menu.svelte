<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';

	export let selectedItem = 'Profile';
	let showMobileMenu = false;

	const menuItems = [
		{ id: 'profile', label: 'Profile', path: '/profile' },
		{ id: 'bunker', label: 'Bunker', path: '/bunker' },
		{ id: 'relays', label: 'Relays', path: '/relays' },
		{ id: 'backup', label: 'Backup', path: '/backup' }
	];

	function handleMenuClick(item) {
		selectedItem = item.id;
		showMobileMenu = false;
		goto(item.path);
	}

	function handleLogout() {
		// TODO - Clear user stores, etc.
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
		class="fixed inset-0 z-40 flex items-center justify-center bg-white sm:hidden dark:bg-neutral-800"
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
		</div>
	</div>
{/if}

<!-- Desktop menu - hidden on mobile -->
<div class="hidden leading-5 text-neutral-700 sm:block sm:w-[90%] dark:text-neutral-100">
	<!-- menu -->
	<div class="">
		{#each menuItems as item}
			<div
				class="mb-4 rounded-md border-b-2 border-l-2 border-neutral-400 px-4 py-2 hover:cursor-pointer hover:text-accent dark:border-neutral-600"
				class:border-neutral-600={selectedItem === item.id}
				class:dark:border-neutral-500={selectedItem === item.id}
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
			Logout <span class="h-5 w-5 rounded-full bg-[url(/icons/pfp.svg)] bg-cover"></span>
		</div>
	</div>
</div>
