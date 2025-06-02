import { type NostrEvent } from '@nostr/tools';
import { finalizeEvent } from '@nostr/tools/pure';
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

	return new Promise((resolve, reject) => {
		const subscription = pool.subscribeMany(
			indexRelays,
			[
				{
					kinds: [0],
					authors: [publicKey],
					limit: 1
				}
			],
			{
				onevent(event) {
					subscription.close();
					const metadata = JSON.parse(event.content);
					resolve(metadata);
				},
				onclose(error) {
					console.error(`Subscription error: ${error}`);
					subscription.close();
					reject(error);
				}
			}
		);
	});
}

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

export async function clearSession() {
	sessionStorage.clear();
}
