<script lang="ts">
	import * as nip11 from '@nostr/tools/nip11';
	import { coordinator } from './bunkers-store';
	import { normalizeURL } from '@nostr/tools/utils';
	import { cleanURL, coordinators } from './utils';

	let isValid = true;
	let errorMessage = '';

	async function setCoordinator(ev: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const value = ev.currentTarget.value;
		isValid = true;
		const nm = normalizeURL(value);
		try {
			await nip11.fetchRelayInformation(nm);
			coordinator.set(nm);
		} catch (_err) {
			// do not set coordinator url
			isValid = false;
		}
	}
</script>

<div class="space-y-2">
	<input
		list="coordinators"
		type="text"
		placeholder="Coordinator URL"
		class={`w-full rounded border-2 bg-white p-3 text-black focus:outline-none dark:bg-neutral-800 dark:text-white ${isValid ? '' : 'border-neutral-300 border-neutral-400 border-neutral-600 border-neutral-700 border-red-500 border-red-500'}`}
		value={cleanURL($coordinator)}
		on:change={setCoordinator}
	/>

	{#if errorMessage}
		<div class="rounded bg-amber-100 p-2 text-sm text-red-600 dark:bg-amber-400 dark:text-red-800">
			{errorMessage}
		</div>
	{/if}
</div>

<datalist id="coordinators">
	{#each coordinators as url}
		<option>{url}</option>
	{/each}
</datalist>
