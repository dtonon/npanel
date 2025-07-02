<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getPublicKey } from 'nostr-tools';
	import { sk } from '$lib/store';
	import { writable } from 'svelte/store';
	import { fetchRelayList, publishRelayList, type RelayInfo } from '$lib/actions';
	import TwoColumnLayout from '$lib/TwoColumnLayout.svelte';
	import Menu from '$lib/Menu.svelte';

	const relays = writable<import('$lib/actions').RelayInfo[]>([]);

	let showAddView = false;
	let newRelayUrl = '';
	let isLoading = true;
	let addError = '';
	let isAdding = false;

	onMount(async () => {
		if ($sk.length === 0) {
			goto('/');
			return;
		}

		try {
			const publicKey = getPublicKey($sk);
			const relayList = await fetchRelayList(publicKey);
			relays.set(relayList);
		} catch (error) {
			console.error('Failed to load relay list:', error);
		} finally {
			isLoading = false;
		}
	});

	function toggleRelayExpansion(index: number) {
		relays.update((list) => {
			return list.map((relay, i) => ({
				...relay,
				expanded: i === index ? !relay.expanded : false
			}));
		});
	}

	async function toggleRelayPermission(index: number, permission: 'read' | 'write') {
		relays.update((list) => {
			if (permission === 'read') {
				list[index].read = !list[index].read;
			} else {
				list[index].write = !list[index].write;
			}
			return [...list];
		});

		try {
			await publishRelayList($sk, $relays);
		} catch (error) {
			console.error('Failed to publish relay list:', error);
		}
	}

	async function removeRelay(index: number) {
		relays.update((list) => {
			list.splice(index, 1);
			return [...list];
		});

		try {
			await publishRelayList($sk, $relays);
		} catch (error) {
			console.error('Failed to publish relay list:', error);
		}
	}

	function validateRelayUrl(url: string): string | null {
		if (!url.trim()) {
			return 'URL is required';
		}

		url = url.trim();
		if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
			url = 'wss://' + url;
		}

		try {
			const parsed = new URL(url);
			if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
				return 'URL must use ws:// or wss:// protocol';
			}
			if (!parsed.hostname) {
				return 'Invalid hostname';
			}
		} catch {
			return 'Invalid URL format';
		}

		// Check if relay already exists
		if ($relays.some((relay) => relay.url === url)) {
			return 'Relay already exists';
		}

		return null;
	}

	async function addRelay() {
		if (isAdding) return;

		addError = '';
		let url = newRelayUrl.trim();

		if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
			url = 'wss://' + url;
		}

		const validationError = validateRelayUrl(url);
		if (validationError) {
			addError = validationError;
			return;
		}

		isAdding = true;

		try {
			const newRelay: RelayInfo = {
				url,
				read: true,
				write: true,
				expanded: false
			};

			relays.update((list) => [...list, newRelay]);
			await publishRelayList($sk, $relays);

			newRelayUrl = '';
			addError = '';
			showAddView = false;
		} catch (error) {
			console.error('Failed to publish relay list:', error);
			addError = 'Failed to add relay. Please try again.';

			// Remove the relay from store if publishing failed
			relays.update((list) => list.filter((r) => r.url !== url));
		} finally {
			isAdding = false;
		}
	}

	function goBackToList() {
		showAddView = false;
		newRelayUrl = '';
		addError = '';
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
						RELAYS
					</div>
				</h1>
			</div>

			<div class="leading-5 text-neutral-700 sm:w-[90%]">
				<Menu selectedItem="relays" />
			</div>
		</div>
	</div>

	<div slot="interactive">
		{#if isLoading}
			<div class="flex justify-center p-8">
				<div class="text-neutral-500">Loading relays...</div>
			</div>
		{:else if showAddView}
			<!-- Add Relay View -->
			<div class="space-y-6">
				<button
					on:click={goBackToList}
					class="flex items-center text-accent transition-colors hover:text-accent/80"
				>
					← Go back to relays' list
				</button>

				<div class="space-y-4">
					<h2 class="text-xl font-semibold text-black dark:text-white">Add a new relay</h2>
					<p class="text-neutral-600 dark:text-neutral-400">
						Enter the relay URL, in the next step you could configure the read/write state
					</p>

					<div class="space-y-4">
						<input
							bind:value={newRelayUrl}
							type="text"
							placeholder="Relay's url"
							class="w-full rounded-lg border border-neutral-300 bg-white p-3 text-black dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
							class:border-red-500={addError}
							disabled={isAdding}
							on:keydown={(e) => e.key === 'Enter' && addRelay()}
							on:input={() => (addError = '')}
						/>

						{#if addError}
							<div class="text-sm text-red-500">{addError}</div>
						{/if}

						<div class="flex justify-end">
							<button
								on:click={addRelay}
								disabled={!newRelayUrl.trim() || isAdding}
								class="inline-flex items-center rounded bg-accent px-8 py-3 text-[1.6rem] text-white transition-colors duration-200 sm:text-[1.3rem]"
							>
								<span>
									{#if isAdding}
										Adding...
									{:else}
										Add
									{/if}
								</span>
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
				</div>
			</div>
		{:else}
			<!-- Main Relays View -->
			<div class="space-y-6">
				<div class="leading-6 text-neutral-600 dark:text-neutral-400">
					In this area you can manage your relays and check their informations. Make sure to have a
					couple of different "read" and "write" relays, it's not necessary to have a lot of relays.
					<button class="text-accent hover:underline">Learn more</button> about relays.
				</div>

				<div class="space-y-3">
					{#each $relays as relay, index}
						<div
							class={`overflow-hidden rounded border-2 ${
								relay.expanded
									? 'border-neutral-700'
									: 'border-neutral-300 hover:border-neutral-400'
							}`}
						>
							<!-- Relay Row -->
							<div
								class="flex cursor-pointer items-center justify-between px-4 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
								on:click={() => toggleRelayExpansion(index)}
								role="button"
								tabindex="0"
								on:keydown={(e) => e.key === 'Enter' && toggleRelayExpansion(index)}
							>
								<div class="flex-1">
									<div class="text-xl text-black dark:text-white">{relay.url}</div>
								</div>

								<div class="flex items-center space-x-2">
									<!-- Read Icon (Eye) -->
									<button
										on:click|stopPropagation={() => toggleRelayPermission(index, 'read')}
										class="rounded p-1 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
										title="Toggle read permission"
									>
										<svg
											class="h-5 w-5 {relay.read
												? 'text-black dark:text-white'
												: 'text-neutral-400'}"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											/>
										</svg>
									</button>

									<!-- Write Icon (Pen) -->
									<button
										on:click|stopPropagation={() => toggleRelayPermission(index, 'write')}
										class="rounded p-1 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
										title="Toggle write permission"
									>
										<svg
											class="h-5 w-5 {relay.write
												? 'text-black dark:text-white'
												: 'text-neutral-400'}"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
									</button>
								</div>
							</div>

							<!-- Expanded Details -->
							{#if relay.expanded}
								<div class="border-t-2 border-neutral-700 bg-neutral-50 p-4 dark:bg-neutral-800">
									<div class="space-y-3">
										<div class="text-sm text-neutral-600 dark:text-neutral-400">
											Relay description xyz with some details<br />
											NIPS: 1, 11, 42, 70, 86<br />
											<a href="mailto:contact@owner.com" class="text-accent hover:underline"
												>contact@owner.com</a
											>
										</div>

										<div class="flex items-center justify-end pt-2">
											<button
												on:click={() => removeRelay(index)}
												class="flex items-center space-x-1 text-sm text-red-500 transition-colors hover:text-red-600"
											>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
													/>
												</svg>
												<span>Remove</span>
											</button>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Add Relay Button -->
				<div class="flex justify-end pt-4">
					<button
						on:click={() => (showAddView = true)}
						class="inline-flex items-center rounded bg-accent px-8 py-3 text-[1.6rem] text-white transition-colors duration-200 sm:text-[1.3rem]"
					>
						<span>Add a relay</span>
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
</TwoColumnLayout>
