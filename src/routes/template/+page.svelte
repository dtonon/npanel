<script lang="ts">
	import TwoColumnLayout from '$lib/TwoColumnLayout.svelte';
	import ContinueButton from '$lib/ContinueButton.svelte';
	import Menu from '$lib/Menu.svelte';
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
						class="break-words text-[3.5rem] leading-[1em] text-black sm:h-auto sm:text-[3.5rem] dark:text-white"
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
		<div class="mb-12 text-neutral-700 dark:text-neutral-100">
			<p class="mb-6">
				Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sollicitudin mollis sem eget
				iaculis. In laoreet quam eu dolor sodales, et pharetra lectus gravida. Sed congue magna quis
				mauris tincidunt varius. Pellentesque ut ipsum commodo, aliquet dolor rhoncus, vehicula
				urna. Fusce pretium arcu vitae quam faucibus, a eleifend leo vestibulum.
			</p>
			<p>
				Nunc erat est, aliquam non mi quis, varius viverra leo. Nunc facilisis mi a massa semper
				auctor. Nulla facilisi. Nullam vitae neque felis. Vestibulum vehicula vulputate luctus.
				Praesent quam mauris, tristique et libero vel, volutpat rutrum dui. Nulla posuere ligula sit
				amet metus lacinia ullamcorper. Phasellus mollis augue non velit efficitur, eu fermentum
				mauris congue.
			</p>
		</div>
		<div class="flex justify-center sm:justify-end">
			<ContinueButton text="Continue" />
		</div>
	</div>
</TwoColumnLayout>
