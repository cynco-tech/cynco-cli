import type { PaginationInfo } from './common';

export interface BankAccount {
	id: string;
	name?: string;
	accountType?: string;
	currency?: string;
	balance?: number;
	institutionName?: string;
	accountNumber?: string;
	createdAt?: string;
}

export interface BankAccountListResponse {
	bankAccounts: BankAccount[];
	pagination?: PaginationInfo;
}

export interface BankTransaction {
	id: string;
	date?: string;
	description?: string;
	amount?: number;
	type?: string;
	status?: string;
	accountName?: string;
	currency?: string;
	createdAt?: string;
}

export interface TransactionListResponse {
	transactions: BankTransaction[];
	pagination?: PaginationInfo;
}

export interface ImportResult {
	imported: number;
	skipped: number;
	duplicates: number;
	dateRange?: { from: string; to: string };
	errors?: Array<{ line: number; message: string }>;
}

export interface ReconcileStatus {
	accountId: string;
	accountName?: string;
	currency?: string;
	bookBalance?: number;
	bankBalance?: number;
	difference?: number;
	totalTransactions?: number;
	reconciledCount?: number;
	unreconciledCount?: number;
	period?: string;
}

export interface CashResponse {
	bankAccounts: BankAccount[];
	pagination?: unknown;
}
