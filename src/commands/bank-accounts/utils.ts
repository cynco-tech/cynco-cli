import { formatMoney } from '../../lib/format';
import { renderTable } from '../../lib/table';
import type { BankAccount } from '../../types/bank';

export type { BankAccount } from '../../types/bank';

export function renderBankAccountsTable(accounts: BankAccount[]): string {
	const headers = ['Name', 'Type', 'Currency', 'Balance', 'Institution', 'ID'];
	const rows = accounts.map((a) => [
		a.name ?? '-',
		a.accountType ?? '-',
		a.currency ?? '-',
		formatMoney(a.balance, a.currency),
		a.institutionName ?? '-',
		a.id,
	]);
	return renderTable(headers, rows, {
		message: 'No bank accounts found.',
		suggestion: 'Connect a bank account in the dashboard: cynco open banking',
	});
}
