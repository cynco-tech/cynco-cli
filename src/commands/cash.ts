import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import { runList } from '../lib/actions';
import type { GlobalOpts } from '../lib/client';
import { formatMoney } from '../lib/format';
import { buildHelpText } from '../lib/help-text';
import { renderTable } from '../lib/table';

interface BankAccount {
	id: string;
	name?: string;
	currency?: string;
	balance?: number;
	accountType?: string;
}

export const cashCmd = new Command('cash')
	.description('Show cash position — all bank account balances')
	.option('--currency <code>', 'Filter by currency (e.g. MYR, USD)')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco cash', 'cynco cash --currency MYR', 'cynco cash --json'],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		await runList<BankAccount[]>(
			{
				spinner: {
					loading: 'Fetching bank accounts...',
					success: 'Cash position loaded',
					fail: 'Failed to fetch bank accounts',
				},
				apiCall: (client) => {
					const params: Record<string, string> = { limit: '100' };
					if (opts.currency) params.currency = opts.currency;
					return client.get('/bank-accounts', params);
				},
				onInteractive: (result) => {
					const accounts = result ?? [];
					if (accounts.length === 0) {
						console.log('\n  No bank accounts found.\n');
						return;
					}

					const headers = ['Account', 'Type', 'Currency', 'Balance'];
					const rows = accounts.map((a) => [
						a.name ?? '-',
						a.accountType ?? '-',
						a.currency ?? '-',
						formatMoney(a.balance, a.currency),
					]);
					console.log('');
					console.log(renderTable(headers, rows));

					// Calculate totals grouped by currency
					const totals = new Map<string, number>();
					for (const a of accounts) {
						const cur = a.currency ?? 'Unknown';
						totals.set(cur, (totals.get(cur) ?? 0) + (a.balance ?? 0));
					}

					console.log('');
					for (const [currency, total] of totals) {
						console.log(
							`  ${pc.bold('Total')} (${currency}): ${pc.green(formatMoney(total, currency))}`,
						);
					}
					console.log('');
				},
			},
			globalOpts,
		);
	});
