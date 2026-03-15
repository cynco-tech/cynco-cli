import { colorizeStatus, formatMoney } from '../../lib/format';
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

export function statusIndicator(status?: string): string {
	if (!status) return '-';
	return colorizeStatus(status.toLowerCase());
}

export const formatCurrency = formatMoney;

export function renderBillsTable(bills: Bill[]): string {
	const headers = ['Number', 'Vendor', 'Status', 'Total', 'Currency', 'Due Date', 'ID'];
	const rows = bills.map((bill) => [
		bill.billNumber ?? '-',
		bill.vendorName ?? '-',
		statusIndicator(bill.status),
		formatCurrency(bill.total, bill.currency),
		bill.currency ?? '-',
		bill.dueDate ?? '-',
		bill.id,
	]);
	return renderTable(headers, rows, 'No bills found.');
}
