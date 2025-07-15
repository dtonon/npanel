<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import { goto } from '$app/navigation';
	import { sk } from '$lib/store';
	import TwoColumnLayout from '$lib/TwoColumnLayout.svelte';
	import Menu from '$lib/Menu.svelte';
	import { addBunker, type BunkerInfo } from '$lib/bunkers-store';

	let bunkerName = '';
	let bunkerActivating = false;
	let activationProgress = 0;
	let advanceSignersSelection = false;
	let selectedSigners = new Set(['signer1', 'signer2', 'signer3']); // Mock signers
	const defaultThreshold = 2;
	const defaultSelected = 3;
	const minThreshold = 2;
	let threshold = 3;
	let total = 4;

	const signers = [
		{ name: 'Signer 1', pubkey: 'signer1' },
		{ name: 'Signer 2', pubkey: 'signer2' },
		{ name: 'Signer 3', pubkey: 'signer3' },
		{ name: 'Signer 4', pubkey: 'signer4' },
		{ name: 'Signer 5', pubkey: 'signer5' }
	];

	function toggleAdvancedMode() {
		advanceSignersSelection = !advanceSignersSelection;
	}

	function toggleSigner(pubkey: string) {
		if (selectedSigners.has(pubkey)) {
			// disable signer
			if (selectedSigners.size > threshold) {
				selectedSigners.delete(pubkey);
				selectedSigners = selectedSigners;
				// if we remove a signer and total is now greater than selected signers, adjust it
				if (total > selectedSigners.size) {
					total = selectedSigners.size;
					// now if threshold is greater than total adjust it too
					if (threshold > total) {
						threshold = total;
					}
				}
			}
		} else {
			// enable signer
			selectedSigners.add(pubkey);
			selectedSigners = selectedSigners;
		}
	}

	function incrementThreshold() {
		if (threshold >= selectedSigners.size) {
			threshold = minThreshold;
		} else {
			threshold++;
		}
	}

	function incrementTotal() {
		if (total >= selectedSigners.size) {
			total = threshold;
		} else {
			total++;
		}
	}

	let advancedButtonContainer: HTMLDivElement;

	function updateEventListeners() {
		if (!advancedButtonContainer) return;

		advancedButtonContainer.querySelectorAll('button.threshold-button').forEach((button) => {
			button.removeEventListener('click', incrementThreshold);
			button.addEventListener('click', incrementThreshold);
		});

		advancedButtonContainer.querySelectorAll('button.total-button').forEach((button) => {
			button.removeEventListener('click', incrementTotal);
			button.addEventListener('click', incrementTotal);
		});
	}

	afterUpdate(updateEventListeners);

	onMount(async () => {
		if ($sk.length === 0) {
			goto('/');
			return;
		}
	});

	function generateRandomBunkerUrl(): string {
		const chars = 'abcdef0123456789';
		let pubkey = '';
		for (let i = 0; i < 64; i++) {
			pubkey += chars.charAt(Math.floor(Math.random() * chars.length));
		}

		const relays = [
			'wss://promenade.fiatjaf.com',
			'wss://relay.nostr.info',
			'wss://nostr.wine',
			'wss://relay.damus.io'
		];
		const randomRelay = relays[Math.floor(Math.random() * relays.length)];

		return `bunker://${pubkey}?relay=${encodeURIComponent(randomRelay)}`;
	}

	async function activate(event: Event) {
		event.preventDefault();
		bunkerActivating = true;

		let intv = setInterval(() => {
			if (activationProgress < 98) activationProgress++;
		}, 100);

		try {
			// Simulate bunker creation process
			for (let i = 0; i <= 100; i += 10) {
				activationProgress = i;
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			const bunkerUrl = generateRandomBunkerUrl();

			const newBunker: BunkerInfo = {
				name: bunkerName || 'New Bunker',
				url: bunkerUrl,
				expanded: true,
				isRenaming: false,
				newName: '',
				isSaving: false
			};

			addBunker(newBunker);
			console.log(`Added bunker: ${newBunker.name} with URL: ${bunkerUrl}`);

			bunkerActivating = false;

			goto('/bunkers');
		} catch (err) {
			console.error(err);
			bunkerActivating = false;
		}

		clearInterval(intv);
	}

	function autofocus(node) {
		node.focus();
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
						ADD BUNKER
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
				← Go back to bunkers' list
			</button>

			<div class="space-y-4">
				<h2 class="text-xl font-semibold text-black dark:text-white">Create a new bunker</h2>
				<p class="text-neutral-600 dark:text-neutral-400">
					To create a new bunker give it a name, you can use the app name you are planning to use
					it, or just something memorable:
				</p>

				<!-- Bunker Name Input -->
				<div>
					<input
						bind:value={bunkerName}
						type="text"
						placeholder="Bunker name..."
						class="w-full rounded border-2 border-neutral-300 bg-white p-3 text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
						disabled={bunkerActivating}
						use:autofocus
					/>
				</div>

				<div class="mt-6">
					{#if !advanceSignersSelection}
						<div class="mt-6">
							This bunker will be created with {advanceSignersSelection
								? selectedSigners.size
								: defaultSelected} signers, requiring {defaultThreshold} signatures to sign events.
						</div>
						<div class="mt-4">
							You can customize these settings using the advanced options below.
						</div>
					{/if}

					{#if advanceSignersSelection}
						<div class="mt-2">Now select the signers you want to include in your bunker:</div>
						<div class="mt-4">
							<div class="space-y-2">
								{#each signers as signer}
									<label class="flex items-center space-x-2">
										<input
											type="checkbox"
											checked={selectedSigners.has(signer.pubkey)}
											on:change={() => toggleSigner(signer.pubkey)}
											disabled={selectedSigners.size <= threshold &&
												selectedSigners.has(signer.pubkey)}
											class="h-4 w-4 text-accent"
										/>
										<span class="text-neutral-700 dark:text-neutral-300">
											{signer.name}
										</span>
									</label>
								{/each}
							</div>
							<div class="mt-4">
								{#if selectedSigners.size < minThreshold}
									You need to select at least {minThreshold - selectedSigners.size} more {minThreshold -
										selectedSigners.size ===
									1
										? 'signer'
										: 'signers'} to continue.
								{:else if selectedSigners.size == 2 && minThreshold == 2}
									With 2 signers selected, both signatures will be required.
								{:else}
									<div bind:this={advancedButtonContainer}>
										This bunker will require
										<button
											class="threshold-button cursor-pointer text-accent underline hover:no-underline"
											>{threshold}</button
										>
										signatures out of
										<button
											class="total-button cursor-pointer text-accent underline hover:no-underline"
											>{total}</button
										>
										selected signers to sign events.
									</div>
								{/if}
							</div>
							{#if threshold == total}
								<div class="mt-2">
									<em>All selected signers will need to sign every event.</em>
								</div>
							{/if}
						</div>
					{/if}

					<button
						class="mt-4 text-left text-sm text-accent underline hover:no-underline"
						on:click={() => toggleAdvancedMode()}
					>
						{advanceSignersSelection ? 'Use default settings' : 'Advanced signer selection'}
					</button>
				</div>

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
					on:click={activate}
					disabled={bunkerActivating || !bunkerName.trim()}
					class={`inline-flex items-center rounded px-8 py-3 text-[1.6rem] transition-colors duration-200 sm:text-[1.3rem] ${
						bunkerActivating || !bunkerName.trim()
							? 'cursor-not-allowed bg-neutral-400 text-neutral-300'
							: 'bg-accent text-white hover:bg-accent/90'
					}`}
				>
					<span>
						{bunkerActivating ? 'Creating bunker...' : 'Create bunker'}
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
