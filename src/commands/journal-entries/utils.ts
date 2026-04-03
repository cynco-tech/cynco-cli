import pc from 'picocolors';
import { statusIndicator as baseStatusIndicator, formatMoney } from '../../lib/format';
import { renderTable } from '../../lib/table';
import type { JournalEntry } from '../../types/journal-entry';

export type { JournalEntry, JournalEntryLine } from '../../types/journal-entry';

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
	return renderTable(headers, rows, {
		message: 'No journal entries found.',
		suggestion:
			'Create one with: cynco journal-entries create --date 2026-01-01 --description "Entry"',
	});
}
