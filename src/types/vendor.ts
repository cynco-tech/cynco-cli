import type { PaginationInfo } from './common';

export interface Vendor {
	id: string;
	name?: string;
	email?: string;
	phone?: string;
	country?: string;
	createdAt?: string;
}

export interface VendorListResponse {
	vendors: Vendor[];
	pagination?: PaginationInfo;
}
