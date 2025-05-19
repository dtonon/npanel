import { writable, type Writable } from 'svelte/store';
export const theme = createLocalWritable('theme', ''); // Empty = system

// Utility function to persist values in localStorage
function createLocalWritable<T>(label: string, initialValue: T): Writable<T> {
	const isBrowser = typeof window !== 'undefined';
	let data = initialValue;
	if (isBrowser) {
		const storedValue = localStorage.getItem(label);
		if (storedValue) {
			try {
				const parsed = JSON.parse(storedValue);
				data = parsed.value;
			} catch (e) {
				data = initialValue;
			}
		}
	}
	const store = writable<T>(data);
	if (isBrowser) {
		store.subscribe((value) => {
			localStorage.setItem(label, JSON.stringify({ type: typeof value, value }));
		});
	}
	return store;
}
