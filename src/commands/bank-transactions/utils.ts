import { formatMoney, statusIndicator } from '../../lib/format';
import { renderTable } from '../../lib/table';

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
	return renderTable(headers, rows, 'No transactions found.');
}
