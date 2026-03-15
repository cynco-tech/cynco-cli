import { renderTable } from '../../lib/table';

export interface Vendor {
	id: string;
	name?: string;
	email?: string;
	phone?: string;
	country?: string;
	createdAt?: string;
}

export function renderVendorsTable(vendors: Vendor[]): string {
	const headers = ['Name', 'Email', 'Phone', 'Country', 'ID'];
	const rows = vendors.map((v) => [
		v.name ?? '-',
		v.email ?? '-',
		v.phone ?? '-',
		v.country ?? '-',
		v.id,
	]);
	return renderTable(headers, rows, 'No vendors found.');
}
