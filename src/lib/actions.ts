import { finalizeEvent } from '@nostr/tools/pure';
import { getPublicKey } from 'nostr-tools';
import { pool } from '@nostr/gadgets/global';
import { SimplePool } from 'nostr-tools/pool';
import { loadNostrUser, type NostrUser } from '@nostr/gadgets/metadata';
import { nsecEncode } from 'nostr-tools/nip19';

export const indexRelays = [
	'wss://purplepag.es',
	'wss://user.kindpag.es',
	'wss://relay.nostr.band',
	'wss://relay.nos.social',
	'wss://relay.damus.io'
];

export async function publishProfile(sk: Uint8Array, metadata: NostrUser) {
	console.log(nsecEncode(sk));

	const publicKey = getPublicKey(sk);

	const existingProfile = await loadNostrUser({
		pubkey: publicKey,
		forceUpdate: true
	});

	// Merge existing metadata with updated values, giving priority to new values
	const mergedMetadata = existingProfile.metadata
		? {
				...Object.fromEntries(
					Object.entries(existingProfile.metadata).filter(
						([k, v]) =>
							[
								'name',
								'picture',
								'about',
								'display_name',
								'website',
								'birthday',
								'nip05',
								'lud16',
								'banner'
							].includes(k) && v
					)
				),
				...metadata
			}
		: metadata;

	const signedEvent = finalizeEvent(
		{
			kind: 0,
			created_at: Math.floor(Date.now() / 1000),
			tags: [],
			content: JSON.stringify(mergedMetadata)
		},
		sk
	);

	// if all relays fail this will throw
	await Promise.any(pool.publish(indexRelays, signedEvent));

	// update local cache with the new values
	loadNostrUser({ pubkey: publicKey, forceUpdate: signedEvent });

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
	nip11?: {
		name?: string;
		description?: string;
		pubkey?: string;
		contact?: string;
		supported_nips?: number[];
		software?: string;
		version?: string;
		limitation?: {
			max_message_length?: number;
			max_subscriptions?: number;
			max_filters?: number;
			max_limit?: number;
			max_subid_length?: number;
			max_event_tags?: number;
			max_content_length?: number;
			min_pow_difficulty?: number;
			auth_required?: boolean;
			payment_required?: boolean;
		};
	};
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

		// Fetch NIP-11 info for each relay
		const relaysWithNip11 = await Promise.all(
			relays.map(async (relay) => {
				const nip11 = await fetchRelayNip11Info(relay.url);
				return { ...relay, nip11 };
			})
		);

		return relaysWithNip11;
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

export async function fetchRelayNip11Info(relayUrl: string): Promise<RelayInfo['nip11']> {
	try {
		const httpUrl = relayUrl.replace('ws://', 'http://').replace('wss://', 'https://');
		const response = await fetch(httpUrl, {
			method: 'GET',
			headers: {
				Accept: 'application/nostr+json'
			}
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const nip11Data = await response.json();
		return nip11Data;
	} catch (error) {
		console.error(`Failed to fetch NIP-11 info for ${relayUrl}:`, error);
		return undefined;
	}
}
