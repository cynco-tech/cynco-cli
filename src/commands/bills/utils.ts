import { formatMoney, statusIndicator } from '../../lib/format';
import { renderTable } from '../../lib/table';
import type { Bill } from '../../types/bill';

export type { Bill } from '../../types/bill';

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
	return renderTable(headers, rows, {
		message: 'No bills found.',
		suggestion: 'Create one with: cynco bills create --vendor-id <id>',
	});
}
