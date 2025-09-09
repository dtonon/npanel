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
	{
		pubkey: '086c222e6ecdcb38f7e42175a1194bc68ba3aefb06cd2a12650c229ca79577b4',
		name: 'test2'
	},
	{
		pubkey: 'ed317ed714a700c454202501cfb14dfb52ba6ea67e8996f10d82aa73d825e313',
		name: 'test3'
	},
	{
		pubkey: '38df86fa0a59c27117267b75e446eaf58d3a9a561252c4f892ed3155df82826f',
		name: 'test4'
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
