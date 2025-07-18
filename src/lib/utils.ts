import type { NostrEvent, UnsignedEvent } from '@nostr/tools';
import HashWorker from './worker?worker';

export const coordinators = ['promenade.fiatjaf.com', 'frostbunker.njump.me'];

export const signers = [
	{
		name: 'fiatjafhome1',
		pubkey: '77ff8d1f2b88ea5a468036d393beef09dc01b4d770c7d4f0c4198f404aa1ffe2'
	},
	{
		name: 'fiatjafhome2',
		pubkey: '19c048b360209beb47344b45bf581f57c30e603946febf10e03534d81ab8a507'
	},
	{
		name: 'fiatjafhome3',
		pubkey: '97a7491f73155d04f209374b144646e3cb89db25f03146b58c572cd1e2d93567'
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
