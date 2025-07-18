<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { sk } from '$lib/store';
	import TwoColumnLayout from '$lib/TwoColumnLayout.svelte';
	import Menu from '$lib/Menu.svelte';
	import SaveButton from '$lib/SaveButton.svelte';
	import { fade } from 'svelte/transition';
	import { bunkerEvent, profiles, coordinator } from '$lib/bunkers-store';
	import { autofocus, cleanURL } from '$lib/utils';
	import CoordinatorInput from '$lib/CoordinatorInput.svelte';
	import { updateBunker } from '$lib/actions';

	let advanced = false;
	let showCopyToast = false;
	let copyToastMessage = '';
	let copyToastPosition = { x: 0, y: 0 };

	$: anyRenaming = $profiles.some?.((bunker) => bunker.isRenaming);

	onMount(() => {
		if ($sk.length === 0) {
			goto('/');
			return;
		}
	});

	function addNewBunker() {
		if (anyRenaming) return;

		if ($profiles.length) {
			// this page will just modify our record with the coordinator
			goto('/bunker-add');
		} else {
			// this page will actually setup the signers and so on
			goto('/bunker-create');
		}
	}

	function toggleBunkerExpansion(index: number) {
		if (anyRenaming) return;

		profiles.update((list) => {
			return list.map((prf, i) => ({
				...prf,
				expanded: i === index ? !prf.expanded : false
			}));
		});
	}

	function startRename(index: number) {
		profiles.update((list) => {
			list[index].isRenaming = true;
			list[index].newName = list[index].name;
			return [...list];
		});
	}

	function cancelRename(index: number) {
		profiles.update((list) => {
			list[index].isRenaming = false;
			list[index].newName = '';
			list[index].isSaving = false;
			return [...list];
		});
	}

	function saveRename(index: number) {
		profiles.update((list) => {
			list[index].name = list[index].newName;
			list[index].newName = '';
			list[index].isSaving = true;
			list[index].isRenaming = false;
			return [...list];
		});

		updateBunker();
	}

	function removeBunker(index: number) {
		const bunkerName = $profiles[index].name;
		if (
			confirm(
				`Are you sure you want to revoke and delete the bunker "${bunkerName}"?\nAll apps that use it will stop working.\nThis action cannot be undone.`
			)
		) {
			profiles.update((list) => {
				list.splice(index, 1);
				return [...list];
			});

			updateBunker();
		}
	}

	function copyToClipboard(url: string, event: MouseEvent) {
		const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		copyToastPosition = {
			x: buttonRect.right + 10,
			y: buttonRect.top + buttonRect.height / 2 - 16
		};

		navigator.clipboard
			.writeText(url)
			.then(() => {
				copyToastMessage = 'URL copied!';
				showCopyToast = true;
				setTimeout(() => {
					showCopyToast = false;
				}, 2000);
			})
			.catch((err) => {
				console.error('Failed to copy: ', err);
			});
	}

	function handleKeyPress(event: KeyboardEvent, index: number) {
		if (event.key === 'Enter') {
			saveRename(index);
		} else if (event.key === 'Escape') {
			cancelRename(index);
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
						BUNKERS
					</div>
				</h1>
			</div>

			<div class="leading-5 text-neutral-700 sm:w-[90%]">
				<Menu selectedItem="bunkers" />
			</div>
		</div>
	</div>

	<div slot="interactive">
		{#if $bunkerEvent === null}
			<div class="flex justify-center p-8">
				<div class="text-neutral-500">Loading bunkers...</div>
			</div>
			<div class="mt-2">
				{#if !advanced}
					Not using <span class="text-sm italic">{cleanURL($coordinator)}</span>?
					<button
						class="text-accent hover:underline"
						on:click={() => {
							advanced = true;
						}}>specify your coordinator</button
					>.
				{:else}
					Specify your coordinator:
					<CoordinatorInput />
				{/if}
			</div>
		{:else}
			<!-- Main Bunkers View -->
			<div class="space-y-6">
				<div class="leading-6 text-neutral-600 dark:text-neutral-400">
					In this area you can manage your bunkers. Bunkers are special signing services that can
					sign events for you remotely.
				</div>
				<div class="mt-2">
					<button class="text-accent hover:underline">Learn more</button> about bunkers.
				</div>
				{#if $bunkerEvent === null}
					<div class="mt-2">
						{#if !advanced}
							Not using <span class="text-sm italic">{cleanURL($coordinator)}</span>?
							<button
								class="text-accent hover:underline"
								on:click={() => {
									advanced = true;
								}}>specify your coordinator</button
							>.
						{:else}
							Specify your coordinator:
							<CoordinatorInput />
						{/if}
					</div>
				{/if}

				<div class="space-y-3">
					{#each $profiles as bunker, index}
						<div
							class={`overflow-hidden rounded border-2 ${
								bunker.expanded
									? 'border-neutral-700 dark:border-neutral-400'
									: anyRenaming
										? 'border-neutral-300 dark:border-neutral-600'
										: 'border-neutral-300 hover:border-neutral-400 dark:border-neutral-600 dark:hover:border-neutral-500'
							}`}
						>
							<!-- Bunker Row -->
							<div
								class={`flex items-center justify-between transition-colors ${
									bunker.isRenaming
										? 'cursor-default'
										: anyRenaming
											? 'cursor-not-allowed'
											: 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800'
								}`}
								on:click={() => !bunker.isRenaming && toggleBunkerExpansion(index)}
								role="button"
								tabindex="0"
								on:keydown={(e) =>
									e.key === 'Enter' && !bunker.isRenaming && toggleBunkerExpansion(index)}
							>
								{#if bunker.isRenaming}
									<div class="flex-1 px-4 py-2">
										<!-- svelte-ignore a11y-autofocus -->
										<input
											bind:value={bunker.newName}
											on:keydown={(e) => handleKeyPress(e, index)}
											on:click|stopPropagation
											class="w-full border-none bg-white text-xl text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
											use:autofocus
										/>
									</div>
									<div class="flex items-center space-x-2">
										<SaveButton
											onClick={() => saveRename(index)}
											disabled={!bunker.newName.trim()}
											text="Save"
											okText="Saved"
											isSaving={bunker.isSaving}
											isModified={bunker.newName.trim() !== bunker.name}
											roundedVariant="rounded-l"
										/>
									</div>
								{:else}
									<div class="flex-1 px-4 py-2 text-xl text-black dark:text-white">
										{bunker.name}
									</div>
									<!-- Copy URL Button -->
									<div class="flex items-center space-x-2 p-2">
										<button
											on:click|stopPropagation={(e) => copyToClipboard(bunker.uri, e)}
											class="rounded p-1 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
											title="Copy URL"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-5 w-5 text-neutral-700 dark:text-neutral-300"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
												<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
											</svg>
										</button>
									</div>
								{/if}
							</div>

							<!-- Expanded Details -->
							{#if bunker.expanded}
								<div
									class="border-t-2 border-neutral-700 bg-neutral-50 p-4 dark:border-neutral-400 dark:bg-neutral-800"
								>
									<div class="space-y-3">
										<div class="break-all text-sm text-neutral-600 dark:text-neutral-400">
											<pre class="whitespace-pre-wrap break-all"><code>{bunker.uri}</code></pre>
										</div>

										{#if bunker.restrictions?.kinds}
											<div class="break-all text-sm text-neutral-600 dark:text-neutral-400">
												restricted to kinds:
												{bunker.restrictions.kinds}
											</div>
										{/if}

										{#if bunker.restrictions?.until}
											<div class="break-all text-sm text-neutral-600 dark:text-neutral-400">
												expires at:
												{new Date(bunker.restrictions.until * 1000).toLocaleString()}
											</div>
										{/if}

										<div class="flex items-center justify-between pt-2">
											<div class="flex items-center space-x-4">
												{#if bunker.isRenaming}
													<button
														on:click={() => cancelRename(index)}
														class="flex items-center space-x-1 text-sm text-accent transition-colors hover:underline"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M6 18L18 6M6 6l12 12"
															/>
														</svg>
														<span>Cancel rename</span>
													</button>
												{:else}
													<button
														on:click={() => startRename(index)}
														class="flex items-center space-x-1 text-sm text-accent transition-colors hover:underline"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
															/>
														</svg>
														<span>Rename</span>
													</button>
												{/if}
											</div>

											<button
												on:click={() => removeBunker(index)}
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
												<span>Revoke</span>
											</button>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Add Bunker Button -->
				<div class="flex justify-end pt-4">
					<button
						on:click={addNewBunker}
						disabled={anyRenaming}
						class={`inline-flex items-center rounded px-8 py-3 text-[1.6rem] transition-colors duration-200 sm:text-[1.3rem] ${
							anyRenaming
								? 'cursor-not-allowed bg-neutral-400 text-neutral-300'
								: 'bg-accent text-white hover:bg-accent/90'
						}`}
					>
						<span>Add a bunker</span>
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

		<!-- Copy Toast -->
		{#if showCopyToast}
			<div
				class="fixed z-50 rounded bg-gray-800 px-3 py-2 text-sm font-semibold text-white shadow-lg"
				style="left: {copyToastPosition.x}px; top: {copyToastPosition.y}px;"
				in:fade={{ duration: 300 }}
				out:fade={{ duration: 300 }}
			>
				{copyToastMessage}
			</div>
		{/if}
	</div>
</TwoColumnLayout>
