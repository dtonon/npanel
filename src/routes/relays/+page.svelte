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

	const maxRelays = 5;

	let isLoading = true;
	let saveTimeout: number;

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
			debouncedSave();
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
			debouncedSave();
		} catch (error) {
			console.error('Failed to publish relay list:', error);
		}
	}

	function debouncedSave() {
		clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => publishRelayList($sk, $relays), 1000);
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
									? 'border-neutral-700 dark:border-neutral-400'
									: 'border-neutral-300 hover:border-neutral-400 dark:border-neutral-600 dark:hover:border-neutral-500'
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
									<div
										class="text-xl text-black dark:text-white {relay.read || relay.write
											? 'text-black dark:text-white'
											: 'text-neutral-400'}"
									>
										{relay.url}
										{#if !relay.read && !relay.write}
											<svg
												class="inline h-5 w-5 text-accent"
												fill="currentColor"
												viewBox="0 0 24 24"
											>
												<circle cx="12" cy="12" r="10"></circle>
												<path
													fill="white"
													d="M12 6a1 1 0 011 1v6a1 1 0 01-2 0V7a1 1 0 011-1zm0 10a1 1 0 100 2 1 1 0 000-2z"
												></path>
											</svg>
										{/if}
									</div>
								</div>

								<div class="flex items-center space-x-2">
									<!-- Read -->
									<button
										on:click|stopPropagation={() => toggleRelayPermission(index, 'read')}
										class="rounded p-1 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
										title="Toggle read permission"
									>
										<div
											class="h-5 w-5 {relay.read
												? 'text-black dark:text-white'
												: 'text-neutral-400'}"
										>
											R
										</div>
									</button>

									<!-- Write -->
									<button
										on:click|stopPropagation={() => toggleRelayPermission(index, 'write')}
										class="rounded p-1 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
										title="Toggle write permission"
									>
										<div
											class="h-5 w-5 {relay.write
												? 'text-black dark:text-white'
												: 'text-neutral-400'}"
										>
											W
										</div>
									</button>
								</div>
							</div>

							<!-- Expanded Details -->
							{#if relay.expanded}
								<div
									class="border-t-2 border-neutral-700 bg-neutral-50 p-4 dark:border-neutral-400 dark:bg-neutral-800"
								>
									<div class="space-y-3">
										{#if !relay.read && !relay.write}
											<div class="mb-3 text-sm text-accent">
												The relay has both Read and Write flags disabled, so it has been removed
												from the list and it will not be available in the next refresh; enable one
												or both flags to add it back.
											</div>
										{/if}
										{#if relay.nip11}
											<div class="text-sm text-neutral-600 dark:text-neutral-400">
												{#if relay.nip11.name}
													<div class="mb-1 font-medium text-black dark:text-white">
														{relay.nip11.name}
													</div>
												{/if}
												{#if relay.nip11.description}
													<div class="mb-2">{relay.nip11.description}</div>
												{/if}
												{#if relay.nip11.supported_nips && relay.nip11.supported_nips.length > 0}
													<div class="mb-2">
														<span class="font-medium">NIPs:</span>
														{relay.nip11.supported_nips.join(', ')}
													</div>
												{/if}
												{#if relay.nip11.software}
													<div class="mb-2">
														<span class="font-medium">Software:</span>
														{relay.nip11.software}
														{#if relay.nip11.version}
															v{relay.nip11.version}
														{/if}
													</div>
												{/if}
												{#if relay.nip11.limitation}
													<div class="mb-2">
														<span class="font-medium">Limitations:</span>
														{#if relay.nip11.limitation.auth_required}
															Auth required,
														{/if}
														{#if relay.nip11.limitation.payment_required}
															Payment required,
														{/if}
														{#if relay.nip11.limitation.max_message_length}
															Max message: {relay.nip11.limitation.max_message_length}
														{/if}
													</div>
												{/if}
												{#if relay.nip11.contact}
													<div>
														<a
															href="mailto:{relay.nip11.contact}"
															class="text-accent hover:underline"
														>
															{relay.nip11.contact}
														</a>
													</div>
												{/if}
											</div>
										{:else}
											<div class="text-sm text-neutral-500 dark:text-neutral-400">
												No relay information available
											</div>
										{/if}

										<div class="flex items-center justify-end pt-2">
											<button
												on:click={() => removeRelay(index)}
												class="flex items-center space-x-1 text-sm text-accent transition-colors hover:underline"
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
				{#if $relays.length < maxRelays}
					<div class="flex justify-end pt-4">
						<button
							on:click={() => goto('/relay-add')}
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
				{:else}
					<div class="text-neutral-600 dark:text-neutral-400">
						Good, you have reached the maximum number of relays you can add!
						{#if $relays.length > maxRelays}
							<span class="text-accent"
								>To optimize your Nostr experience we suggest to remove {$relays.length - maxRelays}
								{$relays.length - maxRelays > 1 ? 'relays' : 'relay'} and keep them to {maxRelays}.</span
							>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</TwoColumnLayout>
