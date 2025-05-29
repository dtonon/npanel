import { finalizeEvent, type NostrEvent } from '@nostr/tools/pure';
import { pool } from '@nostr/gadgets/global';

export const indexRelays = [
	'wss://purplepag.es',
	'wss://user.kindpag.es',
	'wss://relay.nostr.band',
	'wss://relay.nos.social',
	'wss://relay.damus.io'
];

export async function publishProfile(sk: Uint8Array, metadata: any) {
	const signedEvent = finalizeEvent(
		{
			kind: 0,
			created_at: Math.floor(Date.now() / 1000),
			tags: [],
			content: JSON.stringify(metadata)
		},
		sk
	);
	pool.publish(indexRelays, signedEvent);
	console.log('Published ' + JSON.stringify(signedEvent));
}
