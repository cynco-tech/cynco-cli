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
import type { Account } from './utils';
import { renderAccountsTable } from './utils';

interface AccountListResponse {
	accounts: Account[];
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
	.description('List chart of accounts')
	.option('-l, --limit <n>', 'Results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.option('--type <type>', 'Filter by account type (asset, liability, equity, revenue, expense)')
	.option('--active-only', 'Show only active accounts')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco accounts list',
				'cynco accounts ls --type asset',
				'cynco accounts list --active-only --limit 50',
				'cynco accounts list --page 2',
				'cynco accounts list --json',
			],
		}),
	)
	.action(async (opts) => {
		const globalOpts = listCmd.optsWithGlobals() as GlobalOpts;
		const limit = parseLimitOpt(opts.limit, globalOpts);
		const page = parsePageOpt(opts.page, globalOpts);

		const params: Record<string, string> = {
			...buildPaginationParams(page, limit),
		};
		if (opts.type) {
			params.type = opts.type;
		}
		if (opts.activeOnly) {
			params.activeOnly = 'true';
		}

		await runList<AccountListResponse>(
			{
				spinner: {
					loading: 'Fetching accounts...',
					success: 'Accounts loaded',
					fail: 'Failed to fetch accounts',
				},
				apiCall: (client) => client.get('/accounts', params),
				onInteractive: (result) => {
					console.log(renderAccountsTable(result.accounts));
					if (result.pagination) {
						printPaginationHint(result.pagination);
					}
				},
			},
			globalOpts,
		);
	});
