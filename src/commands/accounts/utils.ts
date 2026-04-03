import pc from 'picocolors';
import { renderTable } from '../../lib/table';
import type { Account } from '../../types/account';

export type { Account } from '../../types/account';

export function accountTypeLabel(type?: string): string {
	if (!type) return '-';
	switch (type.toLowerCase()) {
		case 'asset':
			return pc.blue(type);
		case 'liability':
			return pc.red(type);
		case 'equity':
			return pc.magenta(type);
		case 'revenue':
			return pc.green(type);
		case 'expense':
			return pc.yellow(type);
		default:
			return type;
	}
}

export function renderAccountsTable(accounts: Account[]): string {
	const headers = ['Code', 'Name', 'Type', 'Normal Balance', 'Active', 'ID'];
	const rows = accounts.map((a) => [
		a.code ?? '-',
		a.name ?? '-',
		accountTypeLabel(a.type),
		a.normalBalance ?? '-',
		a.isActive === false ? pc.red('No') : pc.green('Yes'),
		a.id,
	]);
	return renderTable(headers, rows, {
		message: 'No accounts found.',
		suggestion: 'Accounts are managed in the dashboard: cynco open settings',
	});
}
