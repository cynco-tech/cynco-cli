import { Command } from '@commander-js/extra-typings';
import { runList } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import {
	buildFilterParams,
	buildPaginationParams,
	parseLimitOpt,
	parsePageOpt,
	printPaginationHint,
} from '../../lib/pagination';
import type { Account, AccountListResponse } from '../../types/account';
import { renderAccountsTable } from './utils';

export const listCmd = new Command('list')
	.alias('ls')
	.description('List chart of accounts')
	.option('-l, --limit <n>', 'Results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.option('--type <type>', 'Filter by account type (asset, liability, equity, revenue, expense)')
	.option('-s, --search <query>', 'Search by name or code')
	.option('--active-only', 'Show only active accounts')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco accounts list',
				'cynco accounts ls --type asset',
				'cynco accounts list --search "cash"',
				'cynco accounts list --active-only --limit 50',
			],
		}),
	)
	.action(async (opts) => {
		const globalOpts = listCmd.optsWithGlobals() as GlobalOpts;
		const limit = parseLimitOpt(opts.limit, globalOpts);
		const page = parsePageOpt(opts.page, globalOpts);

		const params = buildFilterParams(buildPaginationParams(page, limit), {
			type: opts.type,
			search: opts.search,
			activeOnly: opts.activeOnly ? 'true' : undefined,
		});

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
				csv: {
					headers: ['Code', 'Name', 'Type', 'Normal Balance', 'Active', 'ID'],
					toRow: (a: Account) => [
						a.code ?? '',
						a.name ?? '',
						a.type ?? '',
						a.normalBalance ?? '',
						a.isActive === false ? 'No' : 'Yes',
						a.id,
					],
					getItems: (r) => (r as AccountListResponse).accounts ?? [],
				},
			},
			globalOpts,
		);
	});
