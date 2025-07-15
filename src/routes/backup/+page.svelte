<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { sk, npub } from '$lib/store';
	import { nip19 } from 'nostr-tools';
	import { encrypt } from 'nostr-tools/nip49';
	import TwoColumnLayout from '$lib/TwoColumnLayout.svelte';
	import Menu from '$lib/Menu.svelte';

	let backupInitialized = false;
	let backupPrivKey = '';
	let useEncryption = true; // Default to encrypted backup
	let password = '';

	onMount(async () => {
		if ($sk.length === 0) {
			goto('/');
		}
	});

	function downloadBackup() {
		if (useEncryption && password) {
			try {
				backupPrivKey = encrypt($sk, password);
			} catch (error) {
				alert('Error encrypting private key. Please try again.');
				return;
			}
		} else {
			backupPrivKey = nip19.nsecEncode($sk);
		}

		const blob = new Blob([$npub + '\n\n' + backupPrivKey], {
			type: 'text/plain'
		});
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = 'nostr-private-key.txt';
		link.style.display = 'none';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		backupInitialized = true;
	}

	function previewDownloadKey(str: string): string {
		let startCount = 10;
		if (str.startsWith('ncryptsec1')) {
			startCount = 15;
		}
		const firstPart = str.slice(0, startCount);
		const lastPart = str.slice(-8);
		return `${firstPart} ... ${lastPart}`;
	}

	function resetBackup() {
		backupInitialized = false;
		password = '';
	}

	function autofocus(node: HTMLElement) {
		node.focus();
	}
</script>

<!-- Menu component now handles its own positioning for mobile -->

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
						BACKUP
					</div>
				</h1>
			</div>

			<div class="leading-5 text-neutral-700 sm:w-[90%]">
				<Menu selectedItem="backup" />
			</div>
		</div>
	</div>

	<div slot="interactive">
		{#if !backupInitialized}
			<div class="mb-6 text-neutral-600 dark:text-neutral-400">
				In this area you can safely backup your private key downloading a file. The encrypted option
				(ncryptsec) is recommended for security, but you can also export the plain nsec key.
			</div>

			<div class="mb-6">
				<div class="text-xl text-neutral-400 dark:text-neutral-400">Your public key (npub) is</div>
				<div class="break-words text-neutral-600 dark:text-neutral-300">
					{$npub}
				</div>
			</div>
		{/if}

		<div class="flex flex-col justify-end">
			{#if !backupInitialized}
				{#if !useEncryption}
					<button
						on:click={downloadBackup}
						class="inline-flex w-full items-center justify-center rounded bg-accent px-8 py-3 text-[1.3rem] text-white"
					>
						Download plain nsec
						<svg class="ml-4 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8l-8 8-8-8"
							></path>
						</svg>
					</button>

					<button
						on:click={() => {
							useEncryption = true;
						}}
						class="mt-2 text-center text-sm text-neutral-400 hover:underline dark:text-neutral-400"
						>Switch to encrypted backup (recommended)</button
					>
				{/if}

				{#if useEncryption}
					<div class="mb-6 text-neutral-600 dark:text-neutral-400">
						Enter the password you want to use to encrypt your private key (nsec):
					</div>
					<input
						type="password"
						bind:value={password}
						placeholder="Your password..."
						required
						use:autofocus
						class="w-full rounded border-2 border-neutral-300 bg-white px-4 py-2 text-xl text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
					/>
					<button
						class="mt-6 inline-flex w-full items-center justify-center rounded bg-accent px-8 py-3 text-[1.3rem] text-white"
						disabled={!password}
						on:click={downloadBackup}
					>
						Download encrypted backup
						<svg class="ml-4 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8l-8 8-8-8"
							></path>
						</svg>
					</button>

					<button
						on:click={() => {
							useEncryption = false;
							password = '';
						}}
						class="mt-2 text-center text-sm text-neutral-400 hover:underline dark:text-neutral-500"
						>Switch to plain text backup</button
					>
				{/if}
			{:else}
				<div class=" text-neutral-600 dark:text-neutral-300">
					Your backup has been downloaded successfully. Please check that the content of the file
					matches this starting and finishing characters:
					<div class="my-4 rounded bg-amber-100 px-6 py-4 dark:bg-amber-500 dark:text-neutral-950">
						{previewDownloadKey(backupPrivKey)}
					</div>
					{#if useEncryption}
						Your private key has been encrypted with the password you provided. Keep both the file
						and password safe.
					{:else}
						Your private key is in plain text. Keep it secure and never share it.
					{/if}
				</div>
				<button
					on:click={resetBackup}
					class="mt-6 text-left text-sm text-neutral-400 hover:underline dark:text-neutral-400"
					>Download another backup</button
				>
			{/if}
		</div>
	</div>
</TwoColumnLayout>
