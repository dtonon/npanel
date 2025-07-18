import { finalizeEvent } from '@nostr/tools/pure';
import { pool } from '@nostr/gadgets/global';
import { loadNostrUser, nostrUserFromEvent, type ProfileMetadata } from '@nostr/gadgets/metadata';
import { loadRelayList } from '@nostr/gadgets/lists';
import { bunkerEvent, coordinator, profiles, relays, user } from './metadata-store';
import { get } from 'svelte/store';
import { sk } from './store';
import { indexRelays } from './utils';

export async function updateBunker() {
	const curr = get(bunkerEvent);

	// set this now so the UI shows as loading
	bunkerEvent.set(null);

	const newEvt = finalizeEvent(
		{
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
					prf.restrictions ? JSON.stringify(prf.restrictions) : ''
				])
			]
		},
		get(sk)
	);

	const [res] = pool.publish([get(coordinator)], newEvt);
	await res;
}

export async function publishProfile(metadata: ProfileMetadata) {
	const existingProfile = get(user) || { metadata: {} };

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
		get(sk)
	);

	// if all relays fail this will throw
	await Promise.any(
		pool.publish(
			[
				...indexRelays,
				...(get(relays)
					?.filter((r) => r.spec.write)
					.map((r) => r.spec.url) ?? [])
			],
			signedEvent
		)
	);

	// update local cache with the new values
	loadNostrUser({ pubkey: signedEvent.pubkey, forceUpdate: signedEvent });
	user.set(nostrUserFromEvent(signedEvent));

	console.log('Published ' + JSON.stringify(signedEvent));
}

export async function publishRelayList() {
	const tags: string[][] = [];

	for (const relay of get(relays)!) {
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
		get(sk)
	);

	pool.publish(
		[
			...indexRelays,
			...(get(relays)
				?.filter((r) => r.spec.write)
				.map((r) => r.spec.url) ?? [])
		],
		signedEvent
	);

	// update local cache with the new values
	loadRelayList(signedEvent.pubkey, [], signedEvent);

	console.log('Published relay list: ' + JSON.stringify(signedEvent));
}
