<script lang="ts">
	import { onMount } from 'svelte';
	import { base32 } from '@scure/base';
	import { goto } from '$app/navigation';
	import { sk } from '$lib/store';
	import TwoColumnLayout from '$lib/TwoColumnLayout.svelte';
	import Menu from '$lib/Menu.svelte';
	import { bunkerEvent, coordinator, profiles } from '$lib/metadata-store';
	import { updateBunker } from '$lib/actions';
	import { autofocus } from '$lib/utils';

	let bunkerName = '';
	let bunkerKinds = '';
	let bunkerExpiration = '';

	let kindsInvalid = false;
	let bunkerActivating = false;
	let activationProgress = 0;

	onMount(async () => {
		if ($sk.length === 0) {
			goto('/');
			return;
		}
	});

	function handleKinds() {
		kindsInvalid = bunkerKinds.split(',').some((kind) => parseInt(kind).toString() !== kind.trim());
	}

	function add() {
		const secretRand = new Uint8Array(10);
		window.crypto.getRandomValues(secretRand);
		const secret = base32.encode(secretRand);

		profiles.update((list) => {
			list.push({
				expanded: true,
				name: bunkerName,
				isRenaming: false,
				isSaving: true,
				newName: '',
				uri: `bunker://${$bunkerEvent!.tags.find((t) => t[0] === 'h')![1]}?relay=${encodeURIComponent($coordinator)}&secret=${secret}`,
				restrictions:
					bunkerKinds.trim() === '' && bunkerExpiration.trim() === ''
						? null
						: {
								kinds:
									bunkerKinds.trim() === ''
										? undefined
										: bunkerKinds.split(',').map((v) => parseInt(v)),
								until:
									bunkerExpiration.trim() === ''
										? undefined
										: Math.round(Date.parse(bunkerExpiration) / 1000)
							}
			});
			return [...list];
		});

		updateBunker();

		goto('/bunkers');
	}
</script>

<TwoColumnLayout>
	<div slot="intro">
		<div class="w-full">
			<div class="border-l-[0.9rem] border-accent pl-4 sm:-ml-8 sm:mb-8">
				<h1 class="font-bold">
					<div
						class="dark:text-neutral-400sm:text-[2rem] text-[2rem] leading-[1em] text-neutral-500"
					>
						MY NOSTR
					</div>
					<div
						class="break-words text-[3.5rem] leading-[1em] text-black dark:text-white sm:h-auto sm:text-[3.5rem]"
						id="tw"
					>
						BUNKERS
					</div>
				</h1>
			</div>

			<div class="leading-5 text-neutral-700 sm:w-[90%]">
				<Menu selectedItem="bunkers" />
			</div>
		</div>
	</div>

	<div slot="interactive" class="text-neutral-700 dark:text-neutral-300">
		<div class="space-y-6">
			<button
				on:click={() => goto('/bunkers')}
				class="flex items-center text-accent transition-colors hover:text-accent/80"
			>
				← Go back to the list of bunker accesses
			</button>

			<div class="space-y-4">
				<h2 class="text-xl font-semibold text-black dark:text-white">Add a new bunker access</h2>

				<!-- Bunker Name Input -->
				<div>
					<p class="mb-4 text-neutral-600 dark:text-neutral-400">
						To add a new bunker access give it a name, you can use the app name you are planning to
						use it, or just something memorable:
					</p>
					<input
						bind:value={bunkerName}
						type="text"
						placeholder="Bunker name"
						class="w-full rounded border-2 border-neutral-300 bg-white p-3 text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
						disabled={bunkerActivating}
						use:autofocus
					/>
				</div>

				<div class="mt-4">
					<p class="mb-4 text-neutral-600 dark:text-neutral-400">
						Optionally choose a date for this bunker to expire:
					</p>
					<input
						bind:value={bunkerExpiration}
						type="datetime-local"
						min={new Date().toISOString()}
						placeholder="Expires at"
						class="w-full rounded border-2 border-neutral-300 bg-white p-3 text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
						disabled={bunkerActivating}
					/>
				</div>

				<div class="mt-4">
					<p class="mb-4 text-neutral-600 dark:text-neutral-400">
						Optionally restrict it to only work for some kinds:
					</p>
					<input
						bind:value={bunkerKinds}
						type="text"
						placeholder="Comma-separated list of kinds"
						class={`w-full rounded border-2 border-neutral-300 bg-white p-3 text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400 ${kindsInvalid ? 'border-neutral-300 border-neutral-400 border-neutral-600 border-neutral-700 border-red-500 border-red-500' : ''}`}
						disabled={bunkerActivating}
						on:input={handleKinds}
					/>
				</div>

				<div class="mt-6"></div>

				{#if bunkerActivating}
					<div class="mt-6">
						<div class="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
							<div
								class="h-2 rounded-full bg-accent transition-all duration-300 ease-out"
								style="width: {activationProgress}%"
							></div>
						</div>
						<div class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
							Creating bunker... {activationProgress}%
						</div>
					</div>
				{/if}
			</div>
			<div class="mt-16 flex justify-center sm:justify-end">
				<button
					on:click={add}
					disabled={bunkerActivating || !bunkerName.trim() || kindsInvalid}
					class={`inline-flex items-center rounded px-8 py-3 text-[1.6rem] transition-colors duration-200 sm:text-[1.3rem] ${
						bunkerActivating || !bunkerName.trim() || kindsInvalid
							? 'cursor-not-allowed bg-neutral-400 text-neutral-300'
							: 'bg-accent text-white hover:bg-accent/90'
					}`}
				>
					<span>
						{bunkerActivating ? 'Adding...' : 'Add bunker'}
					</span>
					{#if !bunkerActivating}
						<div class="ml-4 mr-2">
							<svg
								class="h-5 w-5"
								viewBox="0 0 32 29"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									fill="currentColor"
									fill-rule="evenodd"
									clip-rule="evenodd"
									d="M16.0695 1.17273C16.7448 0.497436 17.8397 0.497436 18.515 1.17273L30.6195 13.2773C31.2948 13.9526 31.2948 15.0475 30.6195 15.7228L18.515 27.8274C17.8397 28.5026 16.7448 28.5026 16.0695 27.8274C15.3942 27.1521 15.3942 26.0571 16.0695 25.3819L25.2221 16.2293H1.72922C0.774208 16.2293 0 15.4551 0 14.5001C0 13.545 0.774208 12.7708 1.72922 12.7708H25.2221L16.0695 3.61823C15.3942 2.94292 15.3942 1.84805 16.0695 1.17273Z"
								/>
							</svg>
						</div>
					{/if}
				</button>
			</div>
		</div>
	</div>
</TwoColumnLayout>
