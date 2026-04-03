import { renderTable } from '../../lib/table';
import type { Customer } from '../../types/customer';

export type { Customer } from '../../types/customer';

export function renderCustomersTable(customers: Customer[]): string {
	const headers = ['Name', 'Email', 'Phone', 'Country', 'ID'];
	const rows = customers.map((c) => [
		c.name ?? '-',
		c.email ?? '-',
		c.phone ?? '-',
		c.country ?? '-',
		c.id,
	]);
	return renderTable(headers, rows, {
		message: 'No customers found.',
		suggestion: 'Add one with: cynco customers create --name "Company Name"',
	});
}
