import { formatMoney, formatPercent } from '../../lib/format';
import { renderTable } from '../../lib/table';

export interface Item {
	id: string;
	name?: string;
	description?: string;
	unitPrice?: number;
	taxRate?: number;
	createdAt?: string;
}

export function renderItemsTable(items: Item[]): string {
	const headers = ['Name', 'Description', 'Unit Price', 'Tax Rate', 'ID'];
	const rows = items.map((item) => [
		item.name ?? '-',
		item.description ?? '-',
		formatMoney(item.unitPrice),
		formatPercent(item.taxRate),
		item.id,
	]);
	return renderTable(headers, rows, 'No items found.');
}
