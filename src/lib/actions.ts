import { type NostrEvent } from '@nostr/tools';
import { finalizeEvent } from '@nostr/tools/pure';
import { getPublicKey } from 'nostr-tools';
import { pool } from '@nostr/gadgets/global';
import { SimplePool } from 'nostr-tools/pool';

export const indexRelays = [
	'wss://purplepag.es',
	'wss://user.kindpag.es',
	'wss://relay.nostr.band',
	'wss://relay.nos.social',
	'wss://relay.damus.io'
];

export async function fetchProfile(publicKey: string): Promise<Record<string, any> | null> {
	const pool = new SimplePool();

	try {
		const event = await pool.get(indexRelays, {
			kinds: [0],
			authors: [publicKey],
			limit: 1
		});

		if (!event) {
			return null;
		}

		const metadata = JSON.parse(event.content);
		return metadata;
	} catch (error) {
		console.error('Failed to fetch profile:', error);
		throw error;
	}
}

export async function publishProfile(sk: Uint8Array, metadata: any) {
	const publicKey = getPublicKey(sk);

	const existingProfile = await fetchProfile(publicKey);

	// Merge existing metadata with updated values, giving priority to new values
	const mergedMetadata = existingProfile ? { ...existingProfile, ...metadata } : metadata;

	const signedEvent = finalizeEvent(
		{
			kind: 0,
			created_at: Math.floor(Date.now() / 1000),
			tags: [],
			content: JSON.stringify(mergedMetadata)
		},
		sk
	);
	pool.publish(indexRelays, signedEvent);
	console.log('Published ' + JSON.stringify(signedEvent));
}

export async function clearSession() {
	sessionStorage.clear();
}

export interface RelayInfo {
	url: string;
	read: boolean;
	write: boolean;
	expanded?: boolean;
}

export async function fetchRelayList(publicKey: string): Promise<RelayInfo[]> {
	const pool = new SimplePool();

	try {
		const event = await pool.get(indexRelays, {
			kinds: [10002],
			authors: [publicKey],
			limit: 1
		});

		if (!event) {
			return [];
		}

		const relays: RelayInfo[] = [];
		for (const tag of event.tags) {
			if (tag[0] === 'r' && tag[1]) {
				const url = tag[1];
				const marker = tag[2];

				if (marker === 'read') {
					relays.push({ url, read: true, write: false });
				} else if (marker === 'write') {
					relays.push({ url, read: false, write: true });
				} else {
					relays.push({ url, read: true, write: true });
				}
			}
		}

		return relays;
	} catch (error) {
		console.error('Failed to fetch relay list:', error);
		return [];
	}
}

export async function publishRelayList(sk: Uint8Array, relays: RelayInfo[]) {
	const tags: string[][] = [];

	for (const relay of relays) {
		if (relay.read && relay.write) {
			tags.push(['r', relay.url]);
		} else if (relay.read) {
			tags.push(['r', relay.url, 'read']);
		} else if (relay.write) {
			tags.push(['r', relay.url, 'write']);
		}
	}

	const signedEvent = finalizeEvent(
		{
			kind: 10002,
			created_at: Math.floor(Date.now() / 1000),
			tags,
			content: ''
		},
		sk
	);

	pool.publish(indexRelays, signedEvent);
	console.log('Published relay list: ' + JSON.stringify(signedEvent));
}
