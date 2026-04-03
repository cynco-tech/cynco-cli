import { formatMoney, statusIndicator } from '../../lib/format';
import { renderTable } from '../../lib/table';
import type { BankTransaction } from '../../types/bank';

export type { BankTransaction } from '../../types/bank';

export function renderTransactionsTable(transactions: BankTransaction[]): string {
	const headers = ['Date', 'Description', 'Amount', 'Type', 'Status', 'Account', 'ID'];
	const rows = transactions.map((t) => [
		t.date ?? '-',
		t.description ?? '-',
		formatMoney(t.amount, t.currency),
		t.type ?? '-',
		statusIndicator(t.status),
		t.accountName ?? '-',
		t.id,
	]);
	return renderTable(headers, rows, {
		message: 'No transactions found.',
		suggestion: 'Import transactions with: cynco bank-transactions import <file> --account-id <id>',
	});
}
