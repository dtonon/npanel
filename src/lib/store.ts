import { writable, type Writable } from 'svelte/store';
export const theme = createLocalWritable('theme', ''); // Empty = system
export const sk = createSessionWritable<Uint8Array>('sk', new Uint8Array());

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

// Utility function to handle sessionStorage
function createSessionWritable<T>(label: string, initialValue: T): Writable<T> {
	const isBrowser = typeof window !== 'undefined';

	let data;

	if (isBrowser) {
		const storedValue = sessionStorage.getItem(label);
		if (storedValue) {
			const parsedValue = JSON.parse(storedValue);
			if (parsedValue.type === 'Uint8Array') {
				data = base64ToUint8Array(parsedValue.value);
			} else {
				data = parsedValue.value;
			}
		} else {
			data = initialValue;
		}
	} else {
		data = initialValue;
	}

	const store = writable<T>(data);

	if (isBrowser) {
		store.subscribe((value) => {
			let storageValue;
			if (value instanceof Uint8Array) {
				const base64String = uint8ArrayToBase64(value);
				storageValue = JSON.stringify({ type: 'Uint8Array', value: base64String });
			} else if (value instanceof Array) {
				storageValue = JSON.stringify({ type: 'array', value: value });
			} else {
				storageValue = JSON.stringify({ type: 'string', value: value });
			}
			sessionStorage.setItem(label, storageValue);
		});
	}

	return store;
}

// Convert Base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
	const binaryString = atob(base64);
	const len = binaryString.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes;
}

// Convert Uint8Array to Base64
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
	let binaryString = '';
	for (let i = 0; i < uint8Array.length; i++) {
		binaryString += String.fromCharCode(uint8Array[i]);
	}
	return btoa(binaryString);
}
