import { formatMoney, statusIndicator } from '../../lib/format';
import { renderTable } from '../../lib/table';
import type { Invoice } from '../../types/invoice';

export type { Invoice } from '../../types/invoice';

export function renderInvoicesTable(invoices: Invoice[]): string {
	const headers = ['Number', 'Customer', 'Status', 'Total', 'Currency', 'Due Date', 'ID'];
	const rows = invoices.map((inv) => [
		inv.invoiceNumber ?? '-',
		inv.customerName ?? '-',
		statusIndicator(inv.status),
		formatMoney(inv.total, inv.currency),
		inv.currency ?? '-',
		inv.dueDate ?? '-',
		inv.id,
	]);
	return renderTable(headers, rows, {
		message: 'No invoices found.',
		suggestion: 'Create one with: cynco invoices create --customer-id <id>',
	});
}
