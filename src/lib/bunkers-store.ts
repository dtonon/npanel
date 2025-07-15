import { writable } from 'svelte/store';

export type BunkerInfo = {
	name: string;
	url: string;
	expanded: boolean;
	isRenaming: boolean;
	newName: string;
	isSaving: boolean;
};

export const bunkers = writable<BunkerInfo[]>([
	{
		name: 'Main Bunker',
		url: 'bunker://8cfec14dc07bcc113fc447aee962af10d17eef6f7582a905f0bb1cd49904fa9a?relay=wss%3A%2F%2Fpromenade.fiatjaf.com',
		expanded: false,
		isRenaming: false,
		newName: '',
		isSaving: false
	},
	{
		name: 'Backup Bunker',
		url: 'bunker://9d2a33c45f1b6d8e7a3c2b1f0e8d9c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d?relay=wss%3A%2F%2Frelay.nostr.info',
		expanded: false,
		isRenaming: false,
		newName: '',
		isSaving: false
	},
	{
		name: 'Test Bunker',
		url: 'bunker://1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b?relay=wss%3A%2F%2Fnostr.wine',
		expanded: false,
		isRenaming: false,
		newName: '',
		isSaving: false
	}
]);

export function addBunker(bunker: BunkerInfo) {
	bunkers.update(list => [...list, bunker]);
}

export function removeBunker(index: number) {
	bunkers.update(list => {
		list.splice(index, 1);
		return [...list];
	});
}