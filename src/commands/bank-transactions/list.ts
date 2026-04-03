import { Command } from '@commander-js/extra-typings';
import { runList } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { formatMoney } from '../../lib/format';
import { buildHelpText } from '../../lib/help-text';
import {
	buildFilterParams,
	buildPaginationParams,
	parseLimitOpt,
	parsePageOpt,
	printPaginationHint,
} from '../../lib/pagination';
import type { BankTransaction, TransactionListResponse } from '../../types/bank';
import { renderTransactionsTable } from './utils';

export const listCmd = new Command('list')
	.alias('ls')
	.description('List bank transactions')
	.option('-l, --limit <n>', 'Results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.option('--account-id <id>', 'Filter by bank account ID')
	.option(
		'--status <status>',
		'Filter by status (imported, categorized, posted, reconciled, excluded)',
	)
	.option('-s, --search <query>', 'Search by description')
	.option('--from <date>', 'Filter from date (YYYY-MM-DD)')
	.option('--to <date>', 'Filter to date (YYYY-MM-DD)')
	.option('--sort <field>', 'Sort field (e.g. createdAt, date, amount)')
	.option('--order <dir>', 'Sort order (asc, desc)')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco bank-transactions list',
				'cynco txns ls --account-id fac_abc123',
				'cynco bank-transactions list --status reconciled',
				'cynco bank-transactions list --search "payment" --from 2026-01-01',
				'cynco txns list --sort date --order desc --limit 50',
			],
		}),
	)
	.action(async (opts) => {
		const globalOpts = listCmd.optsWithGlobals() as GlobalOpts;
		const limit = parseLimitOpt(opts.limit, globalOpts);
		const page = parsePageOpt(opts.page, globalOpts);

		const params = buildFilterParams(buildPaginationParams(page, limit, opts.sort, opts.order), {
			accountId: opts.accountId,
			status: opts.status,
			search: opts.search,
			from: opts.from,
			to: opts.to,
		});

		await runList<TransactionListResponse>(
			{
				spinner: {
					loading: 'Fetching transactions...',
					success: 'Transactions loaded',
					fail: 'Failed to fetch transactions',
				},
				apiCall: (client) => client.get('/bank-transactions', params),
				onInteractive: (result) => {
					console.log(renderTransactionsTable(result.transactions));
					if (result.pagination) {
						printPaginationHint(result.pagination);
					}
				},
				csv: {
					headers: ['Date', 'Description', 'Amount', 'Type', 'Status', 'Account', 'ID'],
					toRow: (t: BankTransaction) => [
						t.date ?? '',
						t.description ?? '',
						formatMoney(t.amount, t.currency),
						t.type ?? '',
						t.status ?? '',
						t.accountName ?? '',
						t.id,
					],
					getItems: (r) => (r as TransactionListResponse).transactions ?? [],
				},
			},
			globalOpts,
		);
	});
