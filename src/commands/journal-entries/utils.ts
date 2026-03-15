import pc from 'picocolors';
import { statusIndicator as baseStatusIndicator, formatMoney } from '../../lib/format';
import { renderTable } from '../../lib/table';

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

export interface JournalEntryLine {
	accountId: string;
	accountName?: string;
	debit?: number;
	credit?: number;
	description?: string;
}

export function statusIndicator(status?: string): string {
	return baseStatusIndicator(status, { reversed: pc.magenta });
}

export function renderJournalEntriesTable(entries: JournalEntry[]): string {
	const headers = ['Entry#', 'Date', 'Status', 'Description', 'Debit', 'Credit', 'ID'];
	const rows = entries.map((e) => [
		e.entryNumber ?? '-',
		e.date ?? '-',
		statusIndicator(e.status),
		e.description ?? '-',
		formatMoney(e.totalDebit),
		formatMoney(e.totalCredit),
		e.id,
	]);
	return renderTable(headers, rows, 'No journal entries found.');
}
