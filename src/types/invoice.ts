import type { PaginationInfo } from './common';

export interface Invoice {
	id: string;
	invoiceNumber?: string;
	customerName?: string;
	status?: string;
	total?: number;
	currency?: string;
	dueDate?: string;
	createdAt?: string;
}

export interface InvoiceListResponse {
	invoices: Invoice[];
	pagination?: PaginationInfo;
}

export interface PaymentResult {
	id: string;
	invoiceId: string;
	amount: number;
	currency?: string;
	date?: string;
	method?: string;
}

export interface SendResult {
	id: string;
	sentTo?: string;
	sentAt?: string;
}
