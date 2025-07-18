import { derived, writable } from 'svelte/store';
import type { SubCloser } from '@nostr/tools/abstract-pool';
import { finalizeEvent, type NostrEvent } from '@nostr/tools/pure';
import { pool } from '@nostr/gadgets/global';
import { pk, sk } from './store';
import { coordinators } from './utils';
import { normalizeURL } from '@nostr/tools/utils';
import type { Filter } from '@nostr/tools/filter';
import { loadRelayList, type RelayItem } from '@nostr/gadgets/lists';
import { loadNostrUser, type NostrUser } from '@nostr/gadgets/metadata';
import { fetchRelayInformation, type RelayInformation } from '@nostr/tools/nip11';
import { indexRelays } from './utils';

export type BunkerProfile = {
	readonly uri: string;
	name: string;
	restrictions: Filter | null;
	expanded: boolean;
	isRenaming: boolean;
	newName: string;
	isSaving: boolean;
};

export type RelayInfo = {
	spec: RelayItem;
	expanded?: boolean;
	nip11?: RelayInformation;
};

export const relays = writable<RelayInfo[] | null>(null);
export const user = writable<NostrUser | null>(null);
export const coordinator = writable<string>(normalizeURL(coordinators[0]));
export const bunkerEvent = writable<null | NostrEvent>(null); // when this is null that means we're "loading"
export const profiles = writable<BunkerProfile[]>([]);

pk.subscribe(async (pk) => {
	const rl = await loadRelayList(pk, indexRelays, true);

	if (!rl.event || rl.event.tags.length === 0) {
		// remove the hardcoded default relays if that's the case
		rl.items = [];
	}

	const items: RelayInfo[] = [];
	const promises: Promise<void>[] = [];
	for (let i = 0; i < rl.items.length; i++) {
		const p = fetchRelayInformation(rl.items[i].url).then((nip11) => {
			items[i] = { spec: rl.items[i], nip11 };
		});
		promises.push(p);
	}

	await Promise.allSettled(promises);
	relays.set(items);
});

pk.subscribe(async (pk) => {
	user.set(
		await loadNostrUser({
			pubkey: pk,
			relays: indexRelays,
			forceUpdate: true
		})
	);
});

let subc: SubCloser;
derived([coordinator, pk, sk], ([coord, pk, sk]) => ({ coord, pk, sk })).subscribe(
	({ coord, pk, sk }) => {
		if (subc) {
			subc.close();
		}

		if (!pk || !sk || !coord) {
			profiles.set([]);
			return;
		}

		subc = pool.subscribe(
			[coord],
			{
				authors: [pk],
				kinds: [16430],
				limit: 1
			},
			{
				async doauth(event) {
					return finalizeEvent(event, sk);
				},
				oneose() {
					bunkerEvent.update((curr) => {
						if (!curr) return {} as NostrEvent;
						return curr;
					});
					profiles.update((current) => {
						if (current === null) return [];
						return current;
					});
				},
				onevent(evt) {
					bunkerEvent.set(null); // preemptively set to null in case this event is broken

					profiles.update((current) => {
						const h = evt.tags.find((t) => t[0] === 'h')?.[1];
						if (!h) return [];

						const items = [];
						for (let i = 0; i < evt.tags.length; i++) {
							const tag = evt.tags[i];
							if (tag[0] === 'profile') {
								const name = tag[1];
								const secret = tag[2];
								const restrictions = tag[3] === '' ? undefined : JSON.parse(tag[3]);
								const uri = `bunker://${h}?relay=${encodeURIComponent(coord)}&secret=${secret}`;

								items.push({
									// inherit renaming state from previous state
									...((current || []).find((b) => b.uri === uri) ?? {
										isRenaming: false,
										expanded: false
									}),

									name,
									restrictions,
									uri,

									newName: '',
									isSaving: false
								});
							}
						}

						return items;
					});

					bunkerEvent.set(evt);
				}
			}
		);
	}
);
