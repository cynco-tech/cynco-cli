import type { PaginationInfo } from './common';

export interface Customer {
	id: string;
	name?: string;
	email?: string;
	phone?: string;
	country?: string;
	createdAt?: string;
}

export interface CustomerListResponse {
	customers: Customer[];
	pagination?: PaginationInfo;
}
