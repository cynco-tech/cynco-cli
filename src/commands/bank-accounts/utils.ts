import { formatMoney } from '../../lib/format';
import { renderTable } from '../../lib/table';

export interface BankAccount {
	id: string;
	name?: string;
	accountType?: string;
	currency?: string;
	balance?: number;
	institutionName?: string;
	accountNumber?: string;
	createdAt?: string;
}

export const formatBalance = formatMoney;

export function renderBankAccountsTable(accounts: BankAccount[]): string {
	const headers = ['Name', 'Type', 'Currency', 'Balance', 'Institution', 'ID'];
	const rows = accounts.map((a) => [
		a.name ?? '-',
		a.accountType ?? '-',
		a.currency ?? '-',
		formatBalance(a.balance, a.currency),
		a.institutionName ?? '-',
		a.id,
	]);
	return renderTable(headers, rows, 'No bank accounts found.');
}
