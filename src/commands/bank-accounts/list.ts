import { Command } from '@commander-js/extra-typings';
import { runList } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { formatMoney } from '../../lib/format';
import { buildHelpText } from '../../lib/help-text';
import {
	buildPaginationParams,
	parseLimitOpt,
	parsePageOpt,
	printPaginationHint,
} from '../../lib/pagination';
import type { BankAccount, BankAccountListResponse } from '../../types/bank';
import { renderBankAccountsTable } from './utils';

export const listCmd = new Command('list')
	.alias('ls')
	.description('List bank & financial accounts')
	.option('-l, --limit <n>', 'Results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco bank-accounts list',
				'cynco bank-accounts ls',
				'cynco bank-accounts list --limit 50',
				'cynco bank-accounts list --page 2',
				'cynco bank-accounts list --json',
			],
		}),
	)
	.action(async (opts) => {
		const globalOpts = listCmd.optsWithGlobals() as GlobalOpts;
		const limit = parseLimitOpt(opts.limit, globalOpts);
		const page = parsePageOpt(opts.page, globalOpts);

		const params = buildPaginationParams(page, limit);

		await runList<BankAccountListResponse>(
			{
				spinner: {
					loading: 'Fetching bank accounts...',
					success: 'Bank accounts loaded',
					fail: 'Failed to fetch bank accounts',
				},
				apiCall: (client) => client.get('/bank-accounts', params),
				onInteractive: (result) => {
					console.log(renderBankAccountsTable(result.bankAccounts));
					if (result.pagination) {
						printPaginationHint(result.pagination);
					}
				},
				csv: {
					headers: ['Name', 'Type', 'Currency', 'Balance', 'Institution', 'ID'],
					toRow: (a: BankAccount) => [
						a.name ?? '',
						a.accountType ?? '',
						a.currency ?? '',
						formatMoney(a.balance, a.currency),
						a.institutionName ?? '',
						a.id,
					],
					getItems: (r) => (r as BankAccountListResponse).bankAccounts ?? [],
				},
			},
			globalOpts,
		);
	});
