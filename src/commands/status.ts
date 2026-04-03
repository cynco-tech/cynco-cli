import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import type { GlobalOpts } from '../lib/client';
import { requireClient } from '../lib/client';
import { formatMoney } from '../lib/format';
import { buildHelpText } from '../lib/help-text';
import { outputResult } from '../lib/output';
import { createSpinner } from '../lib/spinner';
import { isInteractive } from '../lib/tty';
import type { BankAccount } from '../types/bank';
import type { Bill } from '../types/bill';
import type { Invoice } from '../types/invoice';

interface StatusData {
	cash: { accounts: BankAccount[]; totals: Record<string, number> } | null;
	overdue: { invoices: Invoice[]; total: number } | null;
	upcoming: { bills: Bill[]; total: number } | null;
}

async function fetchSection<T>(
	fn: () => Promise<{ data: T | null; error: { message: string } | null }>,
): Promise<T | null> {
	try {
		const result = await fn();
		if (result.error || !result.data) return null;
		return result.data;
	} catch {
		return null;
	}
}

export const statusCmd = new Command('status')
	.description('Business health summary — cash, overdue, upcoming bills')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco status', 'cynco status --json'],
		}),
	)
	.action(async (_opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		const client = requireClient(globalOpts);
		const spinner = createSpinner('Loading business status...', globalOpts.quiet);

		// Parallel API calls — each section degrades independently
		const [cashData, overdueData, upcomingData] = await Promise.all([
			fetchSection<{ bankAccounts: BankAccount[] }>(() =>
				client.get('/bank-accounts', { limit: '100' }),
			),
			fetchSection<{ invoices: Invoice[] }>(() =>
				client.get('/invoices', { status: 'overdue', limit: '5', sort: 'dueDate', order: 'asc' }),
			),
			fetchSection<{ bills: Bill[] }>(() =>
				client.get('/bills', { status: 'pending', limit: '5', sort: 'dueDate', order: 'asc' }),
			),
		]);

		spinner.stop('Status loaded');

		// Build structured data
		const status: StatusData = { cash: null, overdue: null, upcoming: null };

		if (cashData) {
			const accounts = cashData.bankAccounts ?? [];
			const totals: Record<string, number> = {};
			for (const a of accounts) {
				const cur = a.currency ?? 'Unknown';
				totals[cur] = (totals[cur] ?? 0) + (a.balance ?? 0);
			}
			status.cash = { accounts, totals };
		}

		if (overdueData) {
			const invoices = overdueData.invoices ?? [];
			const total = invoices.reduce((sum, inv) => sum + (inv.total ?? 0), 0);
			status.overdue = { invoices, total };
		}

		if (upcomingData) {
			const bills = upcomingData.bills ?? [];
			const total = bills.reduce((sum, b) => sum + (b.total ?? 0), 0);
			status.upcoming = { bills, total };
		}

		// JSON output
		if (globalOpts.json || !isInteractive()) {
			outputResult(status, { json: globalOpts.json });
			return;
		}

		// Interactive output
		const w = (s: string) => process.stderr.write(`${s}\n`);
		w('');

		// Cash position
		w(`  ${pc.bold('Cash Position')}`);
		w('');
		if (status.cash && status.cash.accounts.length > 0) {
			for (const a of status.cash.accounts) {
				const name = pc.dim((a.name ?? 'Account').padEnd(24));
				w(`  ${name}${pc.green(formatMoney(a.balance, a.currency))}`);
			}
			if (Object.keys(status.cash.totals).length > 1) {
				w('');
				for (const [currency, total] of Object.entries(status.cash.totals)) {
					w(
						`  ${pc.bold('Total')} ${pc.dim(`(${currency}):`)} ${pc.green(formatMoney(total, currency))}`,
					);
				}
			}
		} else {
			w(`  ${pc.dim('No bank accounts connected')}`);
		}

		w('');

		// Overdue invoices
		if (status.overdue && status.overdue.invoices.length > 0) {
			w(`  ${pc.bold(`Overdue Invoices`)} ${pc.dim(`(${status.overdue.invoices.length})`)}`);
			w('');
			for (const inv of status.overdue.invoices) {
				const num = (inv.invoiceNumber ?? inv.id).padEnd(14);
				const customer = pc.dim((inv.customerName ?? '\u2014').padEnd(22));
				w(`  ${num}${customer}${pc.red(formatMoney(inv.total, inv.currency))}`);
			}
		} else {
			w(`  ${pc.bold('Overdue Invoices')}`);
			w(`  ${pc.green('\u2014 none')}`);
		}

		w('');

		// Upcoming bills
		if (status.upcoming && status.upcoming.bills.length > 0) {
			w(`  ${pc.bold('Upcoming Bills')} ${pc.dim(`(${status.upcoming.bills.length})`)}`);
			w('');
			for (const bill of status.upcoming.bills) {
				const num = (bill.billNumber ?? bill.id).padEnd(14);
				const vendor = pc.dim((bill.vendorName ?? '\u2014').padEnd(22));
				const due = bill.dueDate ? pc.dim(`due ${bill.dueDate}`) : '';
				w(`  ${num}${vendor}${formatMoney(bill.total, bill.currency)}  ${due}`);
			}
		} else {
			w(`  ${pc.bold('Upcoming Bills')}`);
			w(`  ${pc.green('\u2014 none')}`);
		}

		w('');
	});
