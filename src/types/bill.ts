import type { PaginationInfo } from './common';

export interface Bill {
	id: string;
	billNumber?: string;
	vendorName?: string;
	status?: string;
	total?: number;
	currency?: string;
	dueDate?: string;
	createdAt?: string;
}

export interface BillListResponse {
	bills: Bill[];
	pagination?: PaginationInfo;
}
