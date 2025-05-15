<div class="flex max-h-max flex-col sm:flex-row">
	<!-- Intro block - Hidden on mobile when we have hamburger menu -->
	<div
		class="gradient flex-none items-center justify-end p-8 sm:flex sm:min-h-screen sm:w-[40%] sm:p-0"
		style="background: linear-gradient(to top right, rgba(220, 220, 220, 0.5), rgba(255, 255, 255, 0.95)), url('/bg/noisy.png');"
	>
		<div class="animate-fade1 w-full sm:mr-10 sm:w-[45%] sm:max-w-[300px]">
			<slot name="intro" />
		</div>
	</div>

	<!-- Interactive block - Full width on mobile -->
	<div
		class="animate-fade2 flex flex-none items-center justify-start bg-white p-8 sm:min-h-screen sm:w-[60%] sm:p-0"
	>
		<div class="animate-fade2 flex w-full max-w-full flex-col sm:ml-16 sm:w-[50%] sm:max-w-[600px]">
			<slot name="interactive" />
		</div>
	</div>
</div>
