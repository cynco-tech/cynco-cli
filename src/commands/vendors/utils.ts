import { renderTable } from '../../lib/table';
import type { Vendor } from '../../types/vendor';

export type { Vendor } from '../../types/vendor';

export function renderVendorsTable(vendors: Vendor[]): string {
	const headers = ['Name', 'Email', 'Phone', 'Country', 'ID'];
	const rows = vendors.map((v) => [
		v.name ?? '-',
		v.email ?? '-',
		v.phone ?? '-',
		v.country ?? '-',
		v.id,
	]);
	return renderTable(headers, rows, {
		message: 'No vendors found.',
		suggestion: 'Add one with: cynco vendors create --name "Vendor Name"',
	});
}
