import type { NostrEvent, UnsignedEvent } from '@nostr/tools';
import HashWorker from './worker?worker';

export const coordinators = ['promenade.fiatjaf.com', 'frostbunker.njump.me'];

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
