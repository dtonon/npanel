<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import { base32 } from '@scure/base';
	import { shardGetBunker } from '@fiatjaf/promenade-trusted-dealer';
	import { goto } from '$app/navigation';
	import { pk, sk } from '$lib/store';
	import TwoColumnLayout from '$lib/TwoColumnLayout.svelte';
	import Menu from '$lib/Menu.svelte';
	import { bunkerEvent, coordinator, profiles, relays } from '$lib/metadata-store';
	import CoordinatorInput from '$lib/CoordinatorInput.svelte';
	import CheckboxWithLabel from '$lib/CheckboxWithLabel.svelte';
	import { pool } from '@nostr/gadgets/global';
	import { loadRelayList } from '@nostr/gadgets/lists';
	import { cleanURL, minePow, signers } from '$lib/utils';
	import { updateBunker } from '$lib/actions';
	import { shuffle } from '$lib/utils';

	let bunkerActivating = false;
	let activationProgress = 0;
	let advanced = false;
	let allSigners = [...signers];
	let newSignerPubkey = '';
	let totalSigners = new Set(allSigners.map((s) => s.pubkey));
	const defaultThreshold = 2;
	const defaultSelected = 3;
	const minThreshold = 2;
	let threshold = defaultThreshold;
	let total = defaultSelected;
	let relaysReady = false;

	$: if ($relays !== null && $relays.filter((r) => r.spec.read).length > 0) {
		relaysReady = true;
	}

	function addSigner() {
		if (newSignerPubkey.trim().length === 64) {
			const pubkey = newSignerPubkey.trim();
			if (!allSigners.find((s) => s.pubkey === pubkey)) {
				allSigners = [...allSigners, { pubkey, name: `custom signer ${allSigners.length + 1}` }];
				totalSigners.add(pubkey);
				totalSigners = totalSigners;
				newSignerPubkey = '';
			}
		}
	}

	function toggleSigner(pubkey: string) {
		if (totalSigners.has(pubkey)) {
			// disable signer
			if (totalSigners.size > threshold) {
				totalSigners.delete(pubkey);
				totalSigners = totalSigners;
				// if we remove a signer and total is now greater than total signers, adjust it
				if (total > totalSigners.size) {
					total = totalSigners.size;
					// now if threshold is greater than total adjust it too
					if (threshold > total) {
						threshold = total;
					}
				}
			}
		} else {
			// enable signer
			totalSigners.add(pubkey);
			totalSigners = totalSigners;
		}
	}

	function incrementThreshold() {
		if (threshold >= totalSigners.size) {
			threshold = minThreshold;
		} else {
			threshold++;
		}
	}

	function incrementTotal() {
		if (total >= totalSigners.size) {
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

	async function activate(event: Event) {
		event.preventDefault();
		bunkerActivating = true;

		let intv = setInterval(() => {
			if (activationProgress < 98) activationProgress++;
		}, 2500);

		const potentialSigners = advanced ? Array.from(totalSigners) : allSigners.map((s) => s.pubkey);
		const signerInboxes = await Promise.all(
			potentialSigners.map((pk) =>
				loadRelayList(pk).then((rl) => rl.items.filter((r) => r.read).map((r) => r.url))
			)
		);

		shuffle(potentialSigners);

		try {
			let account = await shardGetBunker(
				pool,
				$sk,
				$pk,
				advanced ? threshold : defaultThreshold,
				advanced ? total : defaultSelected,
				potentialSigners,
				$coordinator,
				20,
				Object.fromEntries(signerInboxes.map((inb, i) => [potentialSigners[i], inb])),
				$relays!.filter((r) => r.spec.read).map((r) => r.spec.url),
				minePow,
				(p: number) => {
					activationProgress = p;
				},
				(signer: string, err: string | null) => {
					if (err) {
						console.warn('signer', signer, 'err', err);
					}
				}
			);

			console.log(`Created root bunker`);
			bunkerEvent.set(account);

			// automatically create the first profile, with full access
			const secretRand = new Uint8Array(10);
			window.crypto.getRandomValues(secretRand);
			const secret = base32.encode(secretRand);
			profiles.set([
				{
					name: 'Main bunker access',
					uri: `bunker://${account.pubkey}?relay=${$coordinator}&secret=${secret}`,
					restrictions: null,
					newName: '',
					expanded: true,
					isRenaming: false,
					isSaving: true
				}
			]);

			updateBunker().then(() => {
				bunkerActivating = false;
			});

			goto('/bunkers');
		} catch (err) {
			console.error(err);
			alert(err);
			bunkerActivating = false;
		}

		clearInterval(intv);
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
			{#if $profiles.length > 0}
				<button
					on:click={() => goto('/bunkers')}
					class="flex items-center text-accent transition-colors hover:text-accent/80"
				>
					← Go back to bunkers' list
				</button>
			{/if}

			<div class="space-y-4">
				<h2 class="text-xl font-semibold text-black dark:text-white">
					Set up your bunker infrastructure
				</h2>

				{#if relaysReady}
					<div>
						{#if !advanced}
							<div class="mt-6">
								First of all we need to setup the basic configuration of your new FROST
								(multi-signature) bunker.
							</div>
							<div class="mt-6">
								if you do not choose to customize it (see advanced settings below), this bunker will
								be created at <span class="italic">{cleanURL($coordinator)}</span>
								with {defaultSelected} signers, with {defaultThreshold} being required to be online.
							</div>
							<div class="mt-6">
								As soon the bunker will be created, a first main bunker access will be generated,
								then you will able to add more bunker accesses, optionally setting also some
								constranins (expiration and kinds permission).
							</div>
						{/if}

						{#if advanced}
							<div class="mt-2">
								In this advance mode you can select the signers you want to include in your bunker,
								choose the N-of-M threshold and also the coordinator server.
							</div>
							<div class="mt-6">Select the signers you want to use:</div>
							<div class="mt-4">
								<div class="space-y-2">
									{#each allSigners as signer}
										<CheckboxWithLabel
											checked={totalSigners.has(signer.pubkey)}
											onClick={() => toggleSigner(signer.pubkey)}
											disabled={totalSigners.size <= threshold && totalSigners.has(signer.pubkey)}
											>{signer.name}</CheckboxWithLabel
										>
									{/each}
								</div>
								<div class="mt-4 flex items-center">
									<input
										type="text"
										bind:value={newSignerPubkey}
										placeholder="add a new signer pubkey"
										class="h-10 w-full rounded-lg border-2 border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 focus:border-accent focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
									/>
									<button
										on:click={addSigner}
										class="ml-2 rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent/90"
									>
										Add
									</button>
								</div>
								<div class="mt-4">
									{#if totalSigners.size < minThreshold}
										You need to select at least {minThreshold - totalSigners.size} more {minThreshold -
											totalSigners.size ===
										1
											? 'signer'
											: 'signers'} to continue.
									{:else if totalSigners.size == 2 && minThreshold == 2}
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
											total signers to be online.
										</div>
									{/if}
								</div>
								{#if threshold == total}
									<div class="mt-2">
										<strong>Warning</strong>: this scheme is risky, if one of the signers is
										offline, the events will not be able to be signed.
									</div>
								{/if}
							</div>

							<div class="mt-4">
								<p class="mb-2">The coordinator server is:</p>
								<CoordinatorInput />
							</div>
						{/if}

						<button
							class="mt-4 text-left text-sm text-accent underline hover:no-underline"
							on:click={() => {
								advanced = !advanced;
							}}
						>
							{advanced ? 'Go back to the default settings' : 'Advanced settings'}
						</button>
					</div>

					{#if bunkerActivating}
						<div>
							<div class="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
								<div
									class="h-2 rounded-full bg-accent transition-all duration-300 ease-out"
									style="width: {activationProgress}%"
								></div>
							</div>
							<div class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
								Creating bunker... {activationProgress.toFixed(0)}%
							</div>
						</div>
					{/if}

					<div class="flex justify-center sm:justify-end">
						<button
							on:click={activate}
							disabled={bunkerActivating}
							class={`inline-flex items-center rounded px-8 py-3 text-[1.6rem] transition-colors duration-200 sm:text-[1.3rem] ${
								bunkerActivating
									? 'cursor-not-allowed bg-neutral-400 text-neutral-300'
									: 'bg-accent text-white hover:bg-accent/90'
							}`}
						>
							<span>
								{bunkerActivating ? 'Creating bunker...' : 'Set up the bunker'}
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
				{:else}
					<div>
						To create a Bunker, and in any case to use Nostr efficiently, you need to have some read
						relays configured; you can add them in the specific section.

						<div class="mt-8 flex justify-center sm:justify-end">
							<button
								on:click={() => goto('/relays')}
								class="inline-flex items-center rounded bg-accent px-8 py-3 text-[1.6rem] text-white transition-colors duration-200 sm:text-[1.3rem]"
							>
								<span>Configure your relays</span>
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
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</TwoColumnLayout>
