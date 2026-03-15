import { formatMoney, statusIndicator } from '../../lib/format';
import { renderTable } from '../../lib/table';

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

export function renderBillsTable(bills: Bill[]): string {
	const headers = ['Number', 'Vendor', 'Status', 'Total', 'Currency', 'Due Date', 'ID'];
	const rows = bills.map((bill) => [
		bill.billNumber ?? '-',
		bill.vendorName ?? '-',
		statusIndicator(bill.status),
		formatMoney(bill.total, bill.currency),
		bill.currency ?? '-',
		bill.dueDate ?? '-',
		bill.id,
	]);
	return renderTable(headers, rows, 'No bills found.');
}
