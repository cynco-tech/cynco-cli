import type { PaginationInfo } from './common';

export interface Account {
	id: string;
	code?: string;
	name?: string;
	type?: string;
	normalBalance?: string;
	isActive?: boolean;
	description?: string;
	parentId?: string;
	createdAt?: string;
}

export interface AccountListResponse {
	accounts: Account[];
	pagination?: PaginationInfo;
}
