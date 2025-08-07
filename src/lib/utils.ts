import type { NostrEvent, UnsignedEvent } from '@nostr/tools/pure';
import HashWorker from './worker?worker';

export const indexRelays = [
	'wss://purplepag.es',
	'wss://user.kindpag.es',
	'wss://relay.nostr.band',
	'wss://relay.nos.social',
	'wss://relay.damus.io'
];

export const coordinators = ['promenade.fiatjaf.com', 'frostbunker.njump.me'];

export const signers = [
	// {
	// 	name: 'fiatjafhome1',
	// 	pubkey: '77ff8d1f2b88ea5a468036d393beef09dc01b4d770c7d4f0c4198f404aa1ffe2'
	// },
	// {
	// 	name: 'fiatjafhome2',
	// 	pubkey: '19c048b360209beb47344b45bf581f57c30e603946febf10e03534d81ab8a507'
	// },
	// {
	// 	name: 'fiatjafhome3',
	// 	pubkey: '97a7491f73155d04f209374b144646e3cb89db25f03146b58c572cd1e2d93567'
	// },

	{
		pubkey: '4440e4f93c9dcb0a5521f0bf949a1222698b72a1b1e3534b10537100fc94f97f',
		name: 'Artur Brugeman'
	},
	{
		pubkey: '23a3ff76766f5ffc852fa6f2fc5058c1306ee25927632e0f8e213af11a5b8de5',
		name: 'fiatjaf'
	},
	{
		pubkey: 'aa4f53d8041b88adee44cefb62fb49fdeb85d151d1a346e655850c213508ed2e',
		name: 'hodlbod'
	},
	{
		pubkey: 'ad1c6fa1daca939685d34ab541fc9e7b450ef6295aa273addafee74a579d57fb',
		name: 'Sebastix'
	},
	{
		pubkey: '3fcd012e970d9dfba4bc638ae9b6420e2ceca76f3b8e31d0ee3f408023a7c5fd',
		name: 'Pablo'
	},
	{
		pubkey: '4be49a6175734b43c7083ceac11e47bf684ffe65bd021c949bea1702409c119a',
		name: 'Daniele'
	}
];

export function cleanURL(url: string): string {
	let c = url.split('://')[1];
	while (c.endsWith('/')) {
		c = c.substring(0, c.length - 1);
	}
	return c;
}

export async function minePow(
	unsigned: UnsignedEvent,
	difficulty: number,
	onBetterHash: (pow: number) => void
): Promise<Omit<NostrEvent, 'sig'>> {
	const workers: Worker[] = [];
	const nWorkers = 4;
	let best = 0;
	return new Promise((resolve) => {
		for (let i = 0; i < nWorkers; i++) {
			const worker = new HashWorker();
			workers.push(worker);
			worker.postMessage({ evt: unsigned, difficulty, start: i, step: nWorkers });
			worker.onmessage = (ev) => {
				const { pow, evt } = ev.data;
				if (pow) {
					if (pow > best) {
						onBetterHash(pow > difficulty ? difficulty : pow);
						best = pow;
					}
				} else {
					resolve(evt);
					workers.forEach((w) => w.terminate());
				}
			};
		}
	});
}

export function autofocus(node: HTMLElement) {
	node.focus();
}

export function shuffle<I>(arr: I[]) {
	for (let i = 0; i < arr.length; i++) {
		const prev = Math.round(Math.random() * i);
		const tmp = arr[i];
		arr[i] = arr[prev];
		arr[prev] = tmp;
	}
}
