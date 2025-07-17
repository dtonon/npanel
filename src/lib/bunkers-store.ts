import { derived, writable } from 'svelte/store';
import type { SubCloser } from '@nostr/tools/abstract-pool';
import { finalizeEvent, type NostrEvent } from '@nostr/tools/pure';
import { pool } from '@nostr/gadgets/global';
import { pk, sk } from './store';
import { coordinators } from './utils';
import { normalizeURL } from '@nostr/tools/utils';

export type BunkerProfile = {
	readonly uri: string;
	name: string;
	restrictions: string;
	expanded: boolean;
	isRenaming: boolean;
	newName: string;
	isSaving: boolean;
};

export const coordinator = writable<string>(normalizeURL(coordinators[0]));
export const bunkerEvent = writable<null | NostrEvent>(null);
export const profiles = writable<BunkerProfile[]>([]);

let subc: SubCloser;
derived([coordinator, pk, sk], ([coord, pk, sk]) => [coord, pk, sk]).subscribe(
	([coord, pk, sk]) => {
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
				doauth(event) {
					return finalizeEvent(event, sk);
				},
				oneose() {
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
								const restrictions = tag[3];
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
				}
			}
		);
	}
);
