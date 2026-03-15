import { Command } from '@commander-js/extra-typings';
import { runList } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import {
	buildPaginationParams,
	parseLimitOpt,
	parsePageOpt,
	printPaginationHint,
} from '../../lib/pagination';
import type { BankTransaction } from './utils';
import { renderTransactionsTable } from './utils';

interface TransactionListResponse {
	transactions: BankTransaction[];
	pagination?: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
}

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
	.option('--sort <field>', 'Sort field (e.g. createdAt, date, amount)')
	.option('--order <dir>', 'Sort order (asc, desc)')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco bank-transactions list',
				'cynco txns ls --account-id fac_abc123',
				'cynco bank-transactions list --status reconciled',
				'cynco txns list --sort date --order desc --limit 50',
				'cynco bank-transactions list --json',
			],
		}),
	)
	.action(async (opts) => {
		const globalOpts = listCmd.optsWithGlobals() as GlobalOpts;
		const limit = parseLimitOpt(opts.limit, globalOpts);
		const page = parsePageOpt(opts.page, globalOpts);

		const params: Record<string, string> = {
			...buildPaginationParams(page, limit, opts.sort, opts.order),
		};
		if (opts.accountId) {
			params.accountId = opts.accountId;
		}
		if (opts.status) {
			params.status = opts.status;
		}

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
			},
			globalOpts,
		);
	});
