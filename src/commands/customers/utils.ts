import { renderTable } from '../../lib/table';

export interface Customer {
	id: string;
	name?: string;
	email?: string;
	phone?: string;
	country?: string;
	createdAt?: string;
}

export function renderCustomersTable(customers: Customer[]): string {
	const headers = ['Name', 'Email', 'Phone', 'Country', 'ID'];
	const rows = customers.map((c) => [
		c.name ?? '-',
		c.email ?? '-',
		c.phone ?? '-',
		c.country ?? '-',
		c.id,
	]);
	return renderTable(headers, rows, 'No customers found.');
}
