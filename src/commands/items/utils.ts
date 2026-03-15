import { formatMoney } from '../../lib/format';
import { renderTable } from '../../lib/table';

export interface Item {
	id: string;
	name?: string;
	description?: string;
	unitPrice?: number;
	taxRate?: number;
	createdAt?: string;
}

export const formatCurrency = formatMoney;

export function formatPercent(rate?: number): string {
	if (rate == null) return '-';
	return `${rate}%`;
}

export function renderItemsTable(items: Item[]): string {
	const headers = ['Name', 'Description', 'Unit Price', 'Tax Rate', 'ID'];
	const rows = items.map((item) => [
		item.name ?? '-',
		item.description ?? '-',
		formatCurrency(item.unitPrice),
		formatPercent(item.taxRate),
		item.id,
	]);
	return renderTable(headers, rows, 'No items found.');
}
