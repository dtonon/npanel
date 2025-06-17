<script lang="ts">
	import { onMount } from 'svelte';
	import TwoColumnLayout from '$lib/TwoColumnLayout.svelte';
	import SaveButton from '$lib/SaveButton.svelte';
	import LoadingBar from '$lib/LoadingBar.svelte';
	import { isMobile } from '$lib/mobile';
	import Menu from '$lib/Menu.svelte';
	import { sk } from '$lib/store';
	import { getPublicKey } from 'nostr-tools';
	import { fetchProfile, publishProfile } from '$lib/actions';
	import { utf8Encoder } from '@nostr/tools/utils';
	import { base64 } from '@scure/base';
	import { bytesToHex } from '@noble/hashes/utils';
	import { sha256 } from '@noble/hashes/sha256';
	import { finalizeEvent, type EventTemplate } from '@nostr/tools/pure';

	let name = '';
	let picture = '';
	let about = '';
	let website = '';
	let nip05 = '';
	let lud16 = '';
	let picturePreview: string | null = null;
	let uploading = false;
	let saveProgress = 0;

	onMount(async () => {
		const publicKeyHex = getPublicKey($sk);

		const userProfile = await fetchProfile(publicKeyHex);
		console.log('userProfile', userProfile);
		if (userProfile) {
			name = userProfile.name;
			picture = userProfile.picture;
			about = userProfile.about;
			website = userProfile.website;
			nip05 = userProfile.nip05;
			lud16 = userProfile.lud16;
		}
	});

	function triggerFileInput() {
		document.getElementById('image')?.click();
	}

	async function calculateFileHash(file: Blob): Promise<string> {
		return bytesToHex(sha256(new Uint8Array(await file.arrayBuffer())));
	}

	function previewImage(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
				picturePreview = reader.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	async function blossomAuth(file: File) {
		// Calculate the hash of the image
		let imageHash = await calculateFileHash(file);

		// Create the event and sign it
		let eventTemplate: EventTemplate = {
			kind: 24242,
			created_at: Math.floor(Date.now() / 1000),
			tags: [
				['t', 'upload'],
				['x', imageHash],
				['expiration', String(Math.floor(Date.now() / 1000) + 86400)]
			],
			content: 'Upload profile pic'
		};
		let signedEvent = finalizeEvent(eventTemplate, $sk);

		// Return a base64 of the json event
		return base64.encode(utf8Encoder.encode(JSON.stringify(signedEvent)));
	}

	async function uploadImage(file: File) {
		let auth = await blossomAuth(file);
		const arrayBuffer = await file.arrayBuffer();

		const response = await fetch('https://cdn.nostrcheck.me/upload', {
			method: 'PUT',
			headers: {
				Authorization: `Nostr ${auth}`
			},
			body: arrayBuffer
		});

		if (response.ok) {
			const data = await response.json();
			saveProgress = 100;
			return data;
		} else {
			console.error('Upload failed:', response.statusText);
			alert('Image upload failed. Please try again');
		}
	}

	const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

	async function saveProfile() {
		saveProgress = 1;
		if (!name) {
			alert('Please enter a name, bio and website are optional');
			return;
		}

		const fileInput = document.getElementById('image') as HTMLInputElement;

		if (fileInput.files?.[0]) {
			console.log('Uploading');
			uploading = true;
			let intv = setInterval(() => {
				if (saveProgress < 95) saveProgress = saveProgress + 10;
			}, 500);

			try {
				let data = await uploadImage(fileInput.files?.[0]); // Wait for the upload to complete
				fileInput.value = '';
				picture = data.url;
			} catch (error) {
				console.error('Error during upload:', error);
			}
			clearInterval(intv);
			uploading = false;
		}

		publishProfile($sk, {
			name: name,
			about: about,
			picture: picture,
			website:
				website.trim() === '' ? '' : website.startsWith('http') ? website : `https://${website}`,
			nip05: nip05,
			lud16: lud16
		});

		await delay(100);
		saveProgress = 100;
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
						PROFILE
					</div>
				</h1>
			</div>

			<div class="leading-5 text-neutral-700 sm:w-[90%]">
				<Menu selectedItem="profile" />
			</div>
		</div>
	</div>

	<div slot="interactive">
		<div class="mb-6 flex items-end justify-end">
			<button on:click={triggerFileInput} class="text-xl text-neutral-400 dark:text-neutral-500"
				>Your image</button
			>
			<div
				class="-mr-8 ml-2 mt-2 h-1 w-20 border-t-2 border-neutral-300 dark:border-neutral-600"
			></div>
			<button
				on:click={triggerFileInput}
				class="input-hover-enabled h-24 w-24 rounded-full border-2 border-neutral-300 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800"
			>
				<!-- svelte-ignore a11y-img-redundant-alt -->
				{#if picturePreview || picture}
					<img
						src={picturePreview || picture}
						alt="Profile Picture"
						class="h-full w-full rounded-full object-cover"
					/>
				{:else}
					<img
						src="/icons/pfp.svg"
						alt="Default Profile Picture"
						class="h-full w-full rounded-full object-cover"
					/>
				{/if}
			</button>
		</div>
		<div>
			<!-- File input for image upload -->
			<input type="file" id="image" accept="image/*" on:change={previewImage} class="hidden" />
			<!-- svelte-ignore a11y-autofocus -->
			<div class="mb-1 flex items-end justify-between">
				{#if name !== '' && name !== undefined}<label
						for="name"
						class="ml-4 text-xs uppercase text-neutral-700 dark:text-neutral-300"
						>Your (nick)name</label
					>{:else}<div></div>{/if}
				<div class="mr-4 text-right text-xs uppercase text-neutral-500 dark:text-neutral-400">
					Required
				</div>
			</div>
			<!-- svelte-ignore a11y-autofocus -->
			<input
				id="name"
				type="text"
				placeholder="Your (nick)name"
				bind:value={name}
				autofocus={!isMobile}
				class="input-hover-enabled mb-4 w-full rounded border-2 border-neutral-300 bg-white px-4 py-2 text-xl text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
			/>
			<div class="mb-1 flex items-end justify-between">
				{#if about !== '' && about !== undefined}<label
						for="about"
						class="ml-4 text-xs uppercase text-neutral-700 dark:text-neutral-300"
						>Something about you</label
					>{:else}<div></div>{/if}
				<div class="mr-4 text-right text-xs uppercase text-neutral-400 dark:text-neutral-600">
					Optional
				</div>
			</div>
			<textarea
				id="about"
				placeholder="Something about you"
				bind:value={about}
				class="input-hover-enabled mb-4 block w-full rounded border-2 border-neutral-300 bg-white px-4 py-2 text-xl text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
			></textarea>
			<div class="mb-1 flex items-end justify-between">
				{#if website !== '' && website !== undefined}<label
						for="website"
						class="ml-4 text-xs uppercase text-neutral-700 dark:text-neutral-300">Website</label
					>{:else}<div></div>{/if}
				<div class="mr-4 text-right text-xs uppercase text-neutral-400 dark:text-neutral-600">
					Optional
				</div>
			</div>
			<input
				type="text"
				placeholder="Website"
				bind:value={website}
				class="input-hover-enabled mb-4 w-full rounded border-2 border-neutral-300 bg-white px-4 py-2 text-xl text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
			/>
			<div class="mb-1 flex items-end justify-between">
				{#if nip05 !== '' && nip05 !== undefined}<label
						for="nip05"
						class="ml-4 text-xs uppercase text-neutral-700 dark:text-neutral-300"
						>NIP05 Address</label
					>{:else}<div></div>{/if}
				<div class="mr-4 text-right text-xs uppercase text-neutral-400 dark:text-neutral-600">
					Optional
				</div>
			</div>
			<input
				type="text"
				placeholder="NIP05 Address"
				bind:value={nip05}
				class="input-hover-enabled mb-4 w-full rounded border-2 border-neutral-300 bg-white px-4 py-2 text-xl text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
			/>
			<div class="mb-1 flex items-end justify-between">
				{#if lud16 !== '' && lud16 !== undefined}<label
						for="lud16"
						class="ml-4 text-xs uppercase text-neutral-700 dark:text-neutral-300">LN Address</label
					>{:else}<div></div>{/if}
				<div class="mr-4 text-right text-xs uppercase text-neutral-400 dark:text-neutral-600">
					Optional
				</div>
			</div>
			<input
				type="text"
				placeholder="LN Address"
				bind:value={lud16}
				class="input-hover-enabled w-full rounded border-2 border-neutral-300 bg-white px-4 py-2 text-xl text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
			/>
			{#if uploading && saveProgress > 0 && saveProgress < 100}
				<div class="mt-6">
					<LoadingBar progress={saveProgress} />
				</div>
			{/if}
		</div>
		<div class="mt-16 flex justify-center sm:justify-end">
			<SaveButton
				onClick={saveProfile}
				disabled={!name}
				text={saveProgress > 0 && saveProgress < 100 ? 'Saving...' : 'Save'}
				okText="Saved"
				isSaving={saveProgress > 0 && saveProgress < 100}
			/>
		</div>
	</div>
</TwoColumnLayout>
