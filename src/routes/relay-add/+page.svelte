<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getPublicKey } from '@nostr/tools/pure';
	import { sk } from '$lib/store';
	import { writable } from 'svelte/store';
	import { fetchRelayList, publishRelayList, type RelayInfo } from '$lib/actions';
	import TwoColumnLayout from '$lib/TwoColumnLayout.svelte';
	import Menu from '$lib/Menu.svelte';
	import { autofocus } from '$lib/utils';

	const relays = writable<import('$lib/actions').RelayInfo[]>([]);

	let newRelayUrl = '';
	let addError = '';
	let isAdding = false;
	let isValidating = false;
	let validationStatus = '';

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
		}
	});

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
		if ($relays.some((relay) => relay.spec.url === url)) {
			return 'Relay already exists';
		}

		return null;
	}

	async function testWebSocketConnection(url: string): Promise<boolean> {
		return new Promise((resolve) => {
			const ws = new WebSocket(url);
			const timeout = setTimeout(() => {
				ws.close();
				resolve(false);
			}, 5000);

			ws.onopen = () => {
				clearTimeout(timeout);
				ws.close();
				resolve(true);
			};

			ws.onerror = () => {
				clearTimeout(timeout);
				resolve(false);
			};

			ws.onclose = () => {
				clearTimeout(timeout);
			};
		});
	}

	async function testNip11Validation(url: string): Promise<boolean> {
		try {
			const httpUrl = url.replace('ws://', 'http://').replace('wss://', 'https://');
			const response = await fetch(httpUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/nostr+json'
				}
			});

			if (!response.ok) {
				return false;
			}

			const nip11Data = await response.json();
			return nip11Data && typeof nip11Data === 'object';
		} catch {
			return false;
		}
	}

	async function validateRelayConnection(url: string): Promise<string | null> {
		isValidating = true;
		validationStatus = 'Testing WebSocket connection...';

		try {
			const wsConnected = await testWebSocketConnection(url);
			if (wsConnected) {
				validationStatus = 'WebSocket connection successful!';
				return null;
			}

			validationStatus = 'WebSocket failed, checking NIP-11...';
			const nip11Valid = await testNip11Validation(url);
			if (nip11Valid) {
				validationStatus = 'NIP-11 validation successful!';
				return null;
			}

			validationStatus = '';
			return 'Unable to connect to relay or validate via NIP-11';
		} catch {
			validationStatus = '';
			return 'Connection test failed';
		} finally {
			isValidating = false;
		}
	}

	async function addRelay() {
		if (isAdding || isValidating) return;

		addError = '';
		validationStatus = '';
		let url = newRelayUrl.trim();

		if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
			url = 'wss://' + url;
		}

		const validationError = validateRelayUrl(url);
		if (validationError) {
			addError = validationError;
			return;
		}

		const connectionError = await validateRelayConnection(url);
		if (connectionError) {
			addError = connectionError;
			return;
		}

		isAdding = true;

		try {
			const newRelay: RelayInfo = {
				spec: {
					url,
					read: true,
					write: true
				},
				expanded: false
			};

			relays.update((list) => [...list, newRelay]);
			await publishRelayList($sk, $relays);

			goto('/relays');
		} catch (error) {
			console.error('Failed to publish relay list:', error);
			addError = 'Failed to add relay. Please try again.';

			// Remove the relay from store if publishing failed
			relays.update((list) => list.filter((r) => r.spec.url !== url));
		} finally {
			isAdding = false;
		}
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
						ADD RELAY
					</div>
				</h1>
			</div>

			<div class="leading-5 text-neutral-700 sm:w-[90%]">
				<Menu selectedItem="relays" />
			</div>
		</div>
	</div>

	<div slot="interactive">
		<div class="space-y-6">
			<button
				on:click={() => goto('/relays')}
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
						class="w-full rounded border-2 border-neutral-300 bg-white p-3 text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
						class:border-red-500={addError}
						disabled={isAdding || isValidating}
						on:keydown={(e) => e.key === 'Enter' && addRelay()}
						on:input={() => {
							addError = '';
							validationStatus = '';
						}}
						use:autofocus
					/>

					{#if addError}
						<div class="rounded bg-amber-100 p-2 text-sm text-accent dark:bg-amber-400">
							{addError}
						</div>
					{/if}

					{#if validationStatus}
						<div class="text-sm text-neutral-600 dark:text-neutral-400">{validationStatus}</div>
					{/if}

					<div class="flex justify-end">
						<button
							on:click={addRelay}
							disabled={!newRelayUrl.trim() || isAdding || isValidating}
							class={`inline-flex items-center rounded px-8 py-3 text-[1.6rem] transition-colors duration-200 sm:text-[1.3rem] ${
								!newRelayUrl.trim()
									? 'bg-neutral-600 text-white dark:bg-neutral-600'
									: isAdding || isValidating
										? 'cursor-not-allowed bg-neutral-400 text-neutral-300'
										: 'bg-accent text-white'
							}`}
						>
							<span>
								{#if isValidating}
									Validating...
								{:else if isAdding}
									Adding...
								{:else}
									Add
								{/if}
							</span>
							{#if !isValidating && !isAdding}
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
		</div>
	</div>
</TwoColumnLayout>
