import pc from 'picocolors';
import { colorizeStatus, formatMoney } from '../../lib/format';
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
	if (!status) return '-';
	return colorizeStatus(status.toLowerCase(), { reversed: pc.magenta });
}

export const formatAmount = formatMoney;

export function renderJournalEntriesTable(entries: JournalEntry[]): string {
	const headers = ['Entry#', 'Date', 'Status', 'Description', 'Debit', 'Credit', 'ID'];
	const rows = entries.map((e) => [
		e.entryNumber ?? '-',
		e.date ?? '-',
		statusIndicator(e.status),
		e.description ?? '-',
		formatAmount(e.totalDebit),
		formatAmount(e.totalCredit),
		e.id,
	]);
	return renderTable(headers, rows, 'No journal entries found.');
}
