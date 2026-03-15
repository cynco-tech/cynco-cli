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
import type { Customer } from './utils';
import { renderCustomersTable } from './utils';

type ListResponse = {
	customers: Customer[];
	pagination?: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
};

export const listCustomersCmd = new Command('list')
	.alias('ls')
	.description('List customers')
	.option('-l, --limit <n>', 'Max results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.option('--sort <field>', 'Sort field', 'createdAt')
	.option('--order <dir>', 'Sort order (asc|desc)', 'desc')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco customers list',
				'cynco customers ls --limit 50',
				'cynco customers list --sort name --order asc',
				'cynco customers list --page 2',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		const limit = parseLimitOpt(opts.limit, globalOpts);
		const page = parsePageOpt(opts.page, globalOpts);
		const params = buildPaginationParams(page, limit, opts.sort, opts.order);

		await runList<ListResponse>(
			{
				spinner: {
					loading: 'Fetching customers...',
					success: 'Customers loaded',
					fail: 'Failed to fetch customers',
				},
				apiCall: (client) => client.get('/customers', params),
				onInteractive: (result) => {
					console.log(renderCustomersTable(result.customers ?? []));
					if (result.pagination) {
						printPaginationHint(result.pagination);
					}
				},
			},
			globalOpts,
		);
	});
