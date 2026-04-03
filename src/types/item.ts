import type { PaginationInfo } from './common';

export interface Item {
	id: string;
	name?: string;
	description?: string;
	unitPrice?: number;
	taxRate?: number;
	createdAt?: string;
}

export interface ItemListResponse {
	items: Item[];
	pagination?: PaginationInfo;
}
