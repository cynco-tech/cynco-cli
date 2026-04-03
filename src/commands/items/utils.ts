import { formatMoney, formatPercent } from '../../lib/format';
import { renderTable } from '../../lib/table';
import type { Item } from '../../types/item';

export type { Item } from '../../types/item';

export function renderItemsTable(items: Item[]): string {
	const headers = ['Name', 'Description', 'Unit Price', 'Tax Rate', 'ID'];
	const rows = items.map((item) => [
		item.name ?? '-',
		item.description ?? '-',
		formatMoney(item.unitPrice),
		formatPercent(item.taxRate),
		item.id,
	]);
	return renderTable(headers, rows, {
		message: 'No items found.',
		suggestion: 'Create one with: cynco items create --name "Item" --unit-price 100',
	});
}
