<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { checkForExtensionsDelayed } from '$lib/checkExtensions';
	import { detectIncognito } from 'detectincognitojs';
	import { sk } from '$lib/store';
	import { nip19 } from 'nostr-tools';
	import { decrypt } from 'nostr-tools/nip49';

	let isIncognito = false;
	let extensionsPresent = false;
	let loginStr = '';
	let password = '';

	let showPassword = false;

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}

	onMount(async () => {
		const incognitoCheck = await detectIncognito();
		if (incognitoCheck.isPrivate) {
			isIncognito = true;
			console.log('Incognito mode detected');
		}
		// Wait 3 seconds for extensions to fully load
		const hasExtensions = await checkForExtensionsDelayed(1000);
		if (hasExtensions) {
			extensionsPresent = true;
			console.log('Extension detected');
		}
	});

	function copyCurrentUrl() {
		navigator.clipboard.writeText(window.location.href).then(() => {
			alert('URL copied! Now open incognito and paste it.');
		});
	}

	function login() {
		if (loginStr === '') {
			alert('You need to enter your nsec to login');
			return;
		}

		if (loginStr.startsWith('ncryptsec')) {
			if (password === '') {
				alert('You need to enter a password');
				return false;
			}
			try {
				const decoded = decrypt(loginStr, password);
				$sk = decoded;
				goto('/profile');
			} catch (_error) {
				alert(
					"The ncryptsec/password combination doesn't seem to be valid, double check it and try again"
				);
				return false;
			}
		} else {
			try {
				const decoded = nip19.decode(loginStr);
				if (decoded.type === 'nsec') {
					$sk = decoded.data;
					goto('/profile');
				} else {
					console.log('decoded.type', decoded.type);
				}
			} catch (_error) {
				alert("The entered nsec doesn't seem to be valid, double check it and try again");
				return false;
			}
		}
	}

	$: isNcryptsec = loginStr.toLowerCase().startsWith('ncryptsec');
</script>

<div class="dark:bg-neutral-800">
	<div
		class="gradient max-h-max"
		style="background: linear-gradient(to top right, rgba(220, 220, 220, 0.4), rgba(255, 255, 255, 0.9)), url('/bg/noisy.png');"
	>
		<div class="flex min-h-screen items-center justify-center">
			<div class="mx-auto p-8 sm:w-[860px]">
				<!-- Welcome title -->
				<div class="mb-8 border-l-[0.9rem] border-accent pl-4 sm:-ml-8">
					<h1 class="font-bold">
						<div class="text-[2em] leading-[1em] dark:text-neutral-400 sm:text-[3em]">
							YOUR
							<span class="text-accent">NOSTR</span>
						</div>
						<div
							class="break-words text-[3em] leading-[1em] dark:text-white sm:h-auto sm:text-[4em]"
							id="tw"
						>
							ACCOUNT<span class="text-neutral-500">&</span> BUNKER
						</div>
						<div
							class="text-[2em] leading-[1em] text-neutral-700 dark:text-neutral-400 sm:text-[2.4em]"
						>
							MANAGER
						</div>
					</h1>
				</div>

				{#if isIncognito}
					<!-- Intro section -->
					<div class="mb-6 text-[1.3rem] leading-7 text-neutral-700 dark:text-neutral-100">
						<p>
							This tool allows you to manage your Nostr profile, especially multi-signature bunkers.
							<br />Because of the technical operation of multi-signature bunkers, you must use your
							Nsec/Ncryptsec directly to manage them; you cannot use (for now) a browser extension.
						</p>
					</div>

					<!-- Check extensions section -->
					{#if extensionsPresent}
						<div class="mb-6 text-[1.3rem] leading-7 text-neutral-700 dark:text-neutral-100">
							<p>
								Attention: it appears that <strong class="font-semibold"
									>you have some extensions installed and active</strong
								>, for security reasons we reccomend you to
								<strong class="font-semibold text-accent">disable all the extensions</strong> (incognito
								only) before proceeding.
							</p>
						</div>
					{/if}

					<div class="mb-6 flex flex-col gap-4 sm:flex-row">
						<input
							type="text"
							bind:value={loginStr}
							required
							on:keydown={(e) => e.key === 'Enter' && !isNcryptsec && login()}
							placeholder="nsec1... / ncryptsec1..."
							class="input-hover-enabled w-full rounded border-2 border-neutral-300 bg-white px-4 py-2 text-xl text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
						/>
						{#if isNcryptsec}
							<div class="relative w-full">
								{#if showPassword}
									<input
										type="text"
										bind:value={password}
										required
										on:keydown={(e) => e.key === 'Enter' && login()}
										placeholder="Your password"
										class="input-hover-enabled w-full rounded border-2 border-neutral-300 bg-white px-4 py-2 pr-12 text-xl text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
									/>
								{:else}
									<input
										type="password"
										bind:value={password}
										required
										on:keydown={(e) => e.key === 'Enter' && login()}
										placeholder="Your password"
										class="input-hover-enabled w-full rounded border-2 border-neutral-300 bg-white px-4 py-2 pr-12 text-xl text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
									/>
								{/if}
								<button
									type="button"
									on:click={togglePasswordVisibility}
									class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
								>
									{#if showPassword}
										<!-- Eye with strike-through when password is visible -->
										<svg
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="opacity-50"
										>
											<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
											<path
												d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"
											/>
											<path
												d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"
											/>
											<line x1="2" y1="2" x2="22" y2="22" />
										</svg>
									{:else}
										<!-- Regular eye when password is hidden -->
										<svg
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
											<circle cx="12" cy="12" r="3" />
										</svg>
									{/if}
								</button>
							</div>
						{/if}
						<button
							on:click={() => login()}
							class="flex flex-row items-center justify-center gap-2 rounded bg-accent px-8 py-2 text-[1.5rem] text-white"
						>
							Login <img src="/icons/arrow-right.svg" alt="arrow-right" class="h-6 w-6" />
						</button>
					</div>

					<!-- Security section -->
					<div class="text-[1.3rem] leading-7 text-neutral-700 dark:text-neutral-100">
						<p>
							Wait, someone told me that I should never put my nsec in a web app, so doing this in
							NPortal is not so bad? Exactly, <a href="#todo" class="underline">learn why</a>.
						</p>
					</div>
				{:else}
					<div class="text-[1.3rem] leading-7 text-neutral-700 dark:text-neutral-100">
						<p>
							Sorry, <strong class="font-semibold"
								>for security reasons this app can run only in <span class="text-accent"
									>incognito mode</span
								></strong
							>.
						</p>
						<p>
							First
							<button class="underline" on:click={() => copyCurrentUrl()}
								>copy the current URL</button
							>, then open a new incognito window; usually it's under the File menu, or you can use
							these shortcuts:
						</p>
						<ul class="mt-4">
							<li><strong>Chrome:</strong> Ctrl/Cmd+Shift+N</li>
							<li><strong>Firefox:</strong> Ctrl/Cmd+Shift+P</li>
							<li><strong>Safari:</strong> Cmd+Shift+N</li>
						</ul>
						<p class="mt-4">
							Finally, paste the copied URL in the new incognito window and press Enter. Done!
						</p>
					</div>
				{/if}

				<!-- Join section -->
				<div class="my-8 border-t-4 pt-6 dark:border-neutral-700 sm:my-10 sm:pt-8">
					<div class="text-center text-[1em] leading-7 text-neutral-700 dark:text-neutral-100">
						Don’t you have a Nostr accout yet?
					</div>
					<div class="mt-4 flex justify-center">
						<a
							class="flex flex-row items-center justify-center gap-2 rounded bg-neutral-700 px-8 py-2 text-[1.1rem] leading-7 text-white dark:bg-neutral-900"
							href="https://nstart.me"
						>
							Join Nostr now <img src="/icons/arrow-right.svg" alt="Icon" class="h-5 w-5" />
						</a>
					</div>
				</div>

				<div class="mt-10 text-center text-sm text-neutral-400 dark:text-neutral-500 sm:mt-4">
					The source code for this service is <a
						href="https://github.com/dtonon/nstart"
						target="_blank"
						class="block underline sm:inline">free and open</a
					>
				</div>
			</div>
		</div>
	</div>
</div>
