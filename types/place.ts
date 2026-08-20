export type WouldReturn = 'yes' | 'no' | 'maybe';

export interface Place {
	id: string;
	name: string;
	description: string;
	location?: string;
	phone?: string;
	url?: string;
	wouldReturn: WouldReturn;
}
