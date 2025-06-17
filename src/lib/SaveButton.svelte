<script lang="ts">
	export let onClick: (event: Event) => Promise<void> | void;
	export let disabled = false;
	export let text: string;
	export let okText: string;
	export let isSaving = false; // New prop to indicate loading state

	let isShowingSuccess = false;
	let successTimeout: number | null = null;
	let wasLoading = false;

	// Watch for loading state changes to automatically trigger success
	$: {
		if (wasLoading && !isSaving && !disabled) {
			// Loading just finished and button is not disabled - show success
			triggerSuccessState();
		}
		wasLoading = isSaving;
	}

	function triggerSuccessState() {
		isShowingSuccess = true;

		if (successTimeout) {
			clearTimeout(successTimeout);
		}

		successTimeout = setTimeout(() => {
			isShowingSuccess = false;
			successTimeout = null;
		}, 1500);
	}

	import { onDestroy } from 'svelte';
	onDestroy(() => {
		if (successTimeout) {
			clearTimeout(successTimeout);
		}
	});
</script>

<button
	on:click={onClick}
	disabled={disabled || isSaving || isShowingSuccess}
	class={`inline-flex items-center rounded px-8 py-3 text-[1.6rem] transition-colors duration-200 sm:text-[1.3rem] ${
		(disabled || isSaving) && !isShowingSuccess
			? 'cursor-not-allowed bg-neutral-400 text-neutral-300'
			: isShowingSuccess
				? 'cursor-default bg-emerald-500 text-white'
				: 'bg-accent text-white'
	}`}
>
	{isShowingSuccess ? okText : text}
	{#if (!disabled && !isSaving) || isShowingSuccess}
		<div class="ml-4 mr-2">
			{#if isShowingSuccess}
				<!-- Success checkmark icon -->
				<svg class="h-5 w-5" viewBox="0 0 24 21" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path
						fill="currentColor"
						fill-rule="evenodd"
						clip-rule="evenodd"
						d="M23.1192 1.22814C23.6934 1.72938 23.7525 2.60114 23.2512 3.17528L16.0226 11.4553C15.5214 12.0294 14.6496 12.0885 14.0755 11.5873C13.5013 11.086 13.4422 10.2143 13.9435 9.64013L21.1721 1.36014C21.6733 0.786003 22.5451 0.726903 23.1192 1.22814ZM1.06412 11.1641C1.63826 10.6629 2.51002 10.722 3.01126 11.2961L7.75459 16.7293L10.3291 13.7801C10.8304 13.206 11.7021 13.1469 12.2763 13.6481C12.8504 14.1493 12.9096 15.0211 12.4083 15.5952L8.79422 19.7352C8.53216 20.0354 8.15312 20.2077 7.75464 20.2077C7.35615 20.2077 6.97712 20.0354 6.71505 19.7353L0.932123 13.1113C0.430884 12.5371 0.489981 11.6654 1.06412 11.1641Z"
					/>
				</svg>
			{:else}
				<!-- Original arrow icon -->
				<svg class="h-5 w-5" viewBox="0 0 32 29" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path
						fill="currentColor"
						fill-rule="evenodd"
						clip-rule="evenodd"
						d="M16.0695 1.17273C16.7448 0.497436 17.8397 0.497436 18.515 1.17273L30.6195 13.2773C31.2948 13.9526 31.2948 15.0475 30.6195 15.7228L18.515 27.8274C17.8397 28.5026 16.7448 28.5026 16.0695 27.8274C15.3942 27.1521 15.3942 26.0571 16.0695 25.3819L25.2221 16.2293H1.72922C0.774208 16.2293 0 15.4551 0 14.5001C0 13.545 0.774208 12.7708 1.72922 12.7708H25.2221L16.0695 3.61823C15.3942 2.94292 15.3942 1.84805 16.0695 1.17273Z"
					/>
				</svg>
			{/if}
		</div>
	{/if}
</button>
