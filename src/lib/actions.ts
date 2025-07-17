import { finalizeEvent, getPublicKey } from '@nostr/tools/pure';
import { fetchRelayInformation, type RelayInformation } from '@nostr/tools/nip11';
import { pool } from '@nostr/gadgets/global';
import { loadNostrUser, type ProfileMetadata } from '@nostr/gadgets/metadata';
import { loadRelayList, type RelayItem } from '@nostr/gadgets/lists';
import { bunkerEvent, coordinator, profiles } from './bunkers-store';
import { get } from 'svelte/store';
import { sk } from './store';

export const indexRelays = [
	'wss://purplepag.es',
	'wss://user.kindpag.es',
	'wss://relay.nostr.band',
	'wss://relay.nos.social',
	'wss://relay.damus.io'
];

export async function updateBunker() {
	const curr = get(bunkerEvent);
	const newEvt = finalizeEvent({
		...curr!,

		created_at: Math.round(Date.now() / 1000),
		tags: [
			// copy all tags that aren't profiles
			...curr!.tags.filter((t) => t[0] !== 'profile'),

			// then get all our profiles known locally
			...get(profiles).map((prf) => [
				'profile',
				prf.name,
				new URL(prf.uri).searchParams.get('secret') || '',
				prf.restrictions
			])
		]
	}, get(sk));

	let [res] = pool.publish([get(coordinator)], newEvt);
    await res
}

export async function publishProfile(sk: Uint8Array, metadata: ProfileMetadata) {
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

	const publishRelays = await getPublishRelays(publicKey);

	// if all relays fail this will throw
	await Promise.any(pool.publish(publishRelays, signedEvent));

	// update local cache with the new values
	loadNostrUser({ pubkey: publicKey, forceUpdate: signedEvent });

	console.log('Published ' + JSON.stringify(signedEvent));
}

export async function clearSession() {
	sessionStorage.clear();
}

export type RelayInfo = {
	spec: RelayItem;
	expanded?: boolean;
	nip11: RelayInformation;
};

export async function getPublishRelays(publicKey: string): Promise<string[]> {
	const userRelays = await fetchRelayList(publicKey);
	const writeRelays = userRelays.filter((relay) => relay.spec.write).map((relay) => relay.spec.url);

	return [...new Set([...indexRelays, ...writeRelays])];
}

export async function fetchRelayList(publicKey: string): Promise<RelayInfo[]> {
	try {
		const rl = await loadRelayList(publicKey, [], true);

		// fetch NIP-11 info for each relay
		const relays: RelayInfo[] = [];
		for (let i = 0; i < rl.items.length; i++) {
			fetchRelayInformation(rl.items[i].url).then((nip11) => {
				relays[i] = { spec: rl.items[i], nip11 };
			});
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
		if (relay.spec.read && relay.spec.write) {
			tags.push(['r', relay.spec.url]);
		} else if (relay.spec.read) {
			tags.push(['r', relay.spec.url, 'read']);
		} else if (relay.spec.write) {
			tags.push(['r', relay.spec.url, 'write']);
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

	const publicKey = getPublicKey(sk);
	const publishRelays = await getPublishRelays(publicKey);

	pool.publish(publishRelays, signedEvent);
	console.log('Published relay list: ' + JSON.stringify(signedEvent));

	loadRelayList(signedEvent.pubkey, [], signedEvent);
}
