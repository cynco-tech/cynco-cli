import { colorizeStatus, formatMoney } from '../../lib/format';
import { renderTable } from '../../lib/table';

export interface Invoice {
	id: string;
	invoiceNumber?: string;
	customerName?: string;
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

export function renderInvoicesTable(invoices: Invoice[]): string {
	const headers = ['Number', 'Customer', 'Status', 'Total', 'Currency', 'Due Date', 'ID'];
	const rows = invoices.map((inv) => [
		inv.invoiceNumber ?? '-',
		inv.customerName ?? '-',
		statusIndicator(inv.status),
		formatCurrency(inv.total, inv.currency),
		inv.currency ?? '-',
		inv.dueDate ?? '-',
		inv.id,
	]);
	return renderTable(headers, rows, 'No invoices found.');
}
