<script lang="ts">
	import { goto } from '$app/navigation';
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

				<!-- Intro section -->
				<div class="mb-6 text-[1.3rem] leading-7 text-neutral-700 dark:text-neutral-100">
					<p>
						This tool allows you to manage your Nostr profile, especially multi-signature bunkers.
						<br />Because of the technical operation of multi-signature bunkers, you must use your
						Nsec / Ncryptsec directly to manage them; you cannot use (for now) a browser extension.
					</p>
				</div>

				<div class="mb-6 flex flex-col gap-4 sm:flex-row">
					<input
						type="text"
						required
						placeholder="nsec1.....  / ncryptsec1....."
						class="input-hover-enabled w-full rounded border-2 border-neutral-300 bg-white px-4 py-2 text-xl text-black focus:border-neutral-700 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-neutral-400"
					/>
					<button
						on:click={() => goto('/template')}
						class="flex flex-row items-center justify-center gap-2 rounded bg-accent px-8 py-2 text-[1.5rem] text-white"
					>
						Login <img src="/icons/arrow-right.svg" alt="Icon" class="h-6 w-6" />
					</button>
				</div>

				<!-- Security section -->
				<div class="text-[1.3rem] leading-7 text-neutral-700 dark:text-neutral-100">
					<p>
						Wait, someone told me that I should never put my nsec in a web app, so doing this in
						NPortal is not so bad? Exactly, <a href="#todo" class="underline">learn why</a>.
					</p>
				</div>

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
