<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { beforeNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import TwoColumnLayout from '$lib/TwoColumnLayout.svelte';
	import SaveButton from '$lib/SaveButton.svelte';
	import LoadingBar from '$lib/LoadingBar.svelte';
	import { isMobile } from '$lib/mobile';
	import Menu from '$lib/Menu.svelte';
	import { sk, picture } from '$lib/store';
	import { getPublicKey } from 'nostr-tools';
	import { fetchProfile, publishProfile } from '$lib/actions';
	import { utf8Encoder } from '@nostr/tools/utils';
	import { base64 } from '@scure/base';
	import { bytesToHex } from '@noble/hashes/utils';
	import { sha256 } from '@noble/hashes/sha256';
	import { finalizeEvent, type EventTemplate } from '@nostr/tools/pure';

	let name = '';
	let about = '';
	let website = '';
	let nip05 = '';
	let lud16 = '';
	let picturePreview: string | null = null;
	let uploading = false;
	let saveProgress = 0;
	let originalPicture: string = '';
	let isImageDeleted = false;

	// Original values to track changes
	let originalName = '';
	let originalAbout = '';
	let originalWebsite = '';
	let originalNip05 = '';
	let originalLud16 = '';
	let nip05ValidStatus: 'valid' | 'invalid' | 'loading' | null = null;
	let nip05ValidationTimeout: number;
	let lud16ValidStatus: 'valid' | 'invalid' | 'loading' | null = null;
	let lud16ValidationTimeout: number;

	// Reactive variable to track if form has been modified
	$: isFormModified =
		name !== originalName ||
		about !== originalAbout ||
		website !== originalWebsite ||
		nip05 !== originalNip05 ||
		lud16 !== originalLud16 ||
		picturePreview !== null ||
		isImageDeleted;

	// Block navigation if form is modified
	beforeNavigate(({ cancel }) => {
		if (isFormModified && saveProgress === 0) {
			if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
				cancel();
			}
		}
	});

	// Block page unload/refresh if form is modified
	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (isFormModified && saveProgress === 0) {
			event.preventDefault();
			// Most modern browsers ignore custom messages and show their own
			event.returnValue = '';
		}
	}

	// Setup and cleanup browser-only event listeners
	$: if (browser) {
		if (isFormModified) {
			window.addEventListener('beforeunload', handleBeforeUnload);
		} else {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		}
	}

	onMount(async () => {
		if ($sk.length === 0) {
			goto('/');
		}

		const publicKeyHex = getPublicKey($sk);

		const userProfile = await fetchProfile(publicKeyHex);
		console.log('userProfile', userProfile);
		if (userProfile) {
			name = userProfile.name || '';
			$picture = userProfile.picture || '';
			originalPicture = userProfile.picture || '';
			about = userProfile.about || '';
			website = userProfile.website || '';
			nip05 = userProfile.nip05 || '';
			lud16 = userProfile.lud16 || '';

			// Store original values
			originalName = name;
			originalAbout = about;
			originalWebsite = website;
			originalNip05 = nip05;
			originalLud16 = lud16;

			// Validate NIP-05 if present
			if (nip05) {
				checkNip05Validation();
			}

			// Validate LUD-16 if present
			if (lud16) {
				checkLud16Validation();
			}
		}

		window.addEventListener('beforeunload', handleBeforeUnload);
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('beforeunload', handleBeforeUnload);
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
				isImageDeleted = false;
			};
			reader.readAsDataURL(file);
		}
	}

	function deleteImage() {
		if (isImageDeleted) {
			picturePreview = null;
			$picture = originalPicture;
			isImageDeleted = false;
		} else {
			picturePreview = null;
			$picture = '';
			isImageDeleted = true;
		}
		const fileInput = document.getElementById('image') as HTMLInputElement;
		if (fileInput) {
			fileInput.value = '';
		}
	}

	// Check if there's any image to display (preview or stored)
	$: hasImage = picturePreview || $picture;
	// Show delete button only if there's an image or if image was deleted (for undo)
	$: showDeleteButton = hasImage || (isImageDeleted && originalPicture);

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

	async function resizeImage(
		file: File,
		maxWidth: number = 1000,
		maxHeight: number = 1000
	): Promise<File> {
		return new Promise((resolve) => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d')!;
			const img = new Image();

			img.onload = () => {
				// Calculate new dimensions while maintaining aspect ratio
				let { width, height } = img;

				if (width > height) {
					if (width > maxWidth) {
						height = (height * maxWidth) / width;
						width = maxWidth;
					}
				} else {
					if (height > maxHeight) {
						width = (width * maxHeight) / height;
						height = maxHeight;
					}
				}

				canvas.width = width;
				canvas.height = height;
				ctx.drawImage(img, 0, 0, width, height);

				// Convert canvas to blob and create new File
				canvas.toBlob(
					(blob) => {
						if (blob) {
							const resizedFile = new File([blob], file.name, {
								type: file.type,
								lastModified: Date.now()
							});
							resolve(resizedFile);
						}
					},
					file.type,
					0.9
				); // 0.9 quality for JPEG compression
			};

			img.src = URL.createObjectURL(file);
		});
	}

	async function uploadImage(file: File) {
		const resizedFile = await resizeImage(file);
		let auth = await blossomAuth(resizedFile);
		const arrayBuffer = await resizedFile.arrayBuffer();

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

	function isValidEmail(email: string) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	async function validateNip05(nip05Address: string, publicKeyHex: string): Promise<boolean> {
		if (!nip05Address || !isValidEmail(nip05Address)) {
			return false;
		}

		try {
			const [localPart, domain] = nip05Address.split('@');
			const url = `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(localPart)}`;

			const response = await fetch(url);
			if (!response.ok) {
				return false;
			}

			const data = await response.json();
			if (!data.names || typeof data.names !== 'object') {
				return false;
			}

			const storedPubkey = data.names[localPart];
			return storedPubkey === publicKeyHex;
		} catch (error) {
			console.error('NIP-05 validation error:', error);
			return false;
		}
	}

	async function checkNip05Validation() {
		if (!nip05.trim()) {
			nip05ValidStatus = null;
			return;
		}

		nip05ValidStatus = 'loading';
		const publicKeyHex = getPublicKey($sk);
		const isValid = await validateNip05(nip05.trim(), publicKeyHex);
		nip05ValidStatus = isValid ? 'valid' : 'invalid';
	}

	function debouncedNip05Validation() {
		clearTimeout(nip05ValidationTimeout);
		nip05ValidationTimeout = setTimeout(checkNip05Validation, 500);
	}

	async function validateLud16(lud16Address: string): Promise<boolean> {
		if (!lud16Address || !isValidEmail(lud16Address)) {
			return false;
		}

		try {
			const [localPart, domain] = lud16Address.split('@');
			const url = `https://${domain}/.well-known/lnurlp/${encodeURIComponent(localPart)}`;

			const response = await fetch(url);
			if (!response.ok) {
				return false;
			}

			const data = await response.json();
			// Check if it has the required LNURL-pay fields
			return !!(data.callback && data.maxSendable && data.minSendable && data.tag === 'payRequest');
		} catch (error) {
			console.error('LUD-16 validation error:', error);
			return false;
		}
	}

	async function checkLud16Validation() {
		if (!lud16.trim()) {
			lud16ValidStatus = null;
			return;
		}

		lud16ValidStatus = 'loading';
		const isValid = await validateLud16(lud16.trim());
		lud16ValidStatus = isValid ? 'valid' : 'invalid';
	}

	function debouncedLud16Validation() {
		clearTimeout(lud16ValidationTimeout);
		lud16ValidationTimeout = setTimeout(checkLud16Validation, 500);
	}

	async function saveProfile() {
		if (!name) {
			alert('Please enter a name, bio and website are optional');
			return;
		}

		if (nip05 && !isValidEmail(nip05)) {
			alert('Please enter valid NIP05 address');
			return;
		}

		if (nip05 && nip05ValidStatus === 'loading') {
			alert('Please wait for NIP05 validation to complete.');
			return;
		}

		if (nip05 && nip05ValidStatus === 'invalid') {
			alert(
				'NIP05 address is invalid, please verify it matches your public key.\nThe profile has not been saved!'
			);
			return;
		}

		if (lud16 && !isValidEmail(lud16)) {
			alert('Please enter valid LN address');
			return;
		}

		if (lud16 && lud16ValidStatus === 'loading') {
			alert('Please wait for LN address validation to complete.');
			return;
		}

		if (lud16 && lud16ValidStatus === 'invalid') {
			alert(
				'LN address is invalid, please verify it supports LNURL-pay.\nThe profile has not been saved!'
			);
			return;
		}

		saveProgress = 1;

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
				$picture = data.url;
			} catch (error) {
				console.error('Error during upload:', error);
			}
			clearInterval(intv);
			uploading = false;
		}

		publishProfile($sk, {
			name: name,
			about: about,
			picture: $picture,
			website:
				website.trim() === '' ? '' : website.startsWith('http') ? website : `https://${website}`,
			nip05: nip05,
			lud16: lud16
		});

		await delay(100);
		saveProgress = 100;
		isImageDeleted = false;

		// Update original values after successful save
		originalName = name;
		originalAbout = about;
		originalWebsite = website;
		originalNip05 = nip05;
		originalLud16 = lud16;
		picturePreview = null;

		// Validate NIP-05 after save if present
		if (nip05) {
			checkNip05Validation();
		}
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
			<div class="relative">
				<button
					on:click={triggerFileInput}
					class="input-hover-enabled h-24 w-24 rounded-full border-2 border-neutral-300 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800"
				>
					<!-- svelte-ignore a11y-img-redundant-alt -->
					{#if hasImage}
						<img
							src={picturePreview || $picture}
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

				<!-- Delete/Undo button -->
				{#if showDeleteButton}
					<button
						on:click={deleteImage}
						class="absolute -right-0 -top-0 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-700 text-white hover:bg-accent dark:bg-neutral-700 dark:hover:bg-accent"
						title={isImageDeleted ? 'Undo delete' : 'Delete image'}
					>
						{#if isImageDeleted}
							<!-- Undo icon -->
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
								/>
							</svg>
						{:else}
							<!-- X icon -->
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						{/if}
					</button>
				{/if}
			</div>
		</div>
		<div>
			<!-- File input for image upload -->
			<input type="file" id="image" accept="image/*" on:change={previewImage} class="hidden" />
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
			<div class="relative mb-4">
				<input
					type="text"
					placeholder="NIP05 Address"
					bind:value={nip05}
					on:input={debouncedNip05Validation}
					class="input-hover-enabled w-full rounded border-2 border-neutral-300 bg-white px-4 py-2 pr-12 text-xl text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
				/>
				{#if nip05.trim() && nip05ValidStatus}
					<div class="absolute right-3 top-1/2 -translate-y-1/2">
						{#if nip05ValidStatus === 'loading'}
							<!-- Loading spinner -->
							<svg class="h-5 w-5 animate-spin text-neutral-400" fill="none" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						{:else if nip05ValidStatus === 'valid'}
							<!-- Valid checkmark -->
							<svg
								class="h-5 w-5 text-emerald-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								></path>
							</svg>
						{:else if nip05ValidStatus === 'invalid'}
							<!-- Invalid alert circle with exclamation -->
							<svg class="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
								<circle cx="12" cy="12" r="10"></circle>
								<path
									fill="white"
									d="M12 6a1 1 0 011 1v6a1 1 0 01-2 0V7a1 1 0 011-1zm0 10a1 1 0 100 2 1 1 0 000-2z"
								></path>
							</svg>
						{/if}
					</div>
				{/if}
			</div>
			<div class="mb-1 flex items-end justify-between">
				{#if lud16 !== '' && lud16 !== undefined}<label
						for="lud16"
						class="ml-4 text-xs uppercase text-neutral-700 dark:text-neutral-300">LN Address</label
					>{:else}<div></div>{/if}
				<div class="mr-4 text-right text-xs uppercase text-neutral-400 dark:text-neutral-600">
					Optional
				</div>
			</div>
			<div class="relative">
				<input
					type="text"
					placeholder="LN Address"
					bind:value={lud16}
					on:input={debouncedLud16Validation}
					class="input-hover-enabled w-full rounded border-2 border-neutral-300 bg-white px-4 py-2 pr-12 text-xl text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
				/>
				{#if lud16.trim() && lud16ValidStatus}
					<div class="absolute right-3 top-1/2 -translate-y-1/2">
						{#if lud16ValidStatus === 'loading'}
							<!-- Loading spinner -->
							<svg class="h-5 w-5 animate-spin text-neutral-400" fill="none" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						{:else if lud16ValidStatus === 'valid'}
							<!-- Valid checkmark -->
							<svg
								class="h-5 w-5 text-emerald-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								></path>
							</svg>
						{:else if lud16ValidStatus === 'invalid'}
							<!-- Invalid alert circle with exclamation -->
							<svg class="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
								<circle cx="12" cy="12" r="10"></circle>
								<path
									fill="white"
									d="M12 6a1 1 0 011 1v6a1 1 0 01-2 0V7a1 1 0 011-1zm0 10a1 1 0 100 2 1 1 0 000-2z"
								></path>
							</svg>
						{/if}
					</div>
				{/if}
			</div>
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
				isModified={isFormModified}
			/>
		</div>
	</div>
</TwoColumnLayout>
