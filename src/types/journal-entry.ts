import type { PaginationInfo } from './common';

export interface JournalEntryLine {
	accountId: string;
	accountName?: string;
	debit?: number;
	credit?: number;
	description?: string;
}

export interface JournalEntry {
	id: string;
	entryNumber?: string;
	date?: string;
	status?: string;
	description?: string;
	totalDebit?: number;
	totalCredit?: number;
	memo?: string;
	createdAt?: string;
	lines?: JournalEntryLine[];
}

export interface JournalEntryListResponse {
	journalEntries: JournalEntry[];
	pagination?: PaginationInfo;
}

export interface BatchResult {
	total: number;
	succeeded: number;
	failed: number;
	results?: Array<{
		index: number;
		status: 'success' | 'error';
		id?: string;
		error?: string;
	}>;
}
