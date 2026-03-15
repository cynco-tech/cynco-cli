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
import type { Vendor } from './utils';
import { renderVendorsTable } from './utils';

type ListResponse = {
	vendors: Vendor[];
	pagination?: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
};

export const listVendorsCmd = new Command('list')
	.alias('ls')
	.description('List vendors')
	.option('-l, --limit <n>', 'Max results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.option('--sort <field>', 'Sort field', 'created_at')
	.option('--order <dir>', 'Sort order (asc|desc)', 'desc')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco vendors list',
				'cynco vendors ls --limit 50',
				'cynco vendors list --sort name --order asc',
				'cynco vendors list --page 2',
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
					loading: 'Fetching vendors...',
					success: 'Vendors loaded',
					fail: 'Failed to fetch vendors',
				},
				apiCall: (client) => client.get('/vendors', params),
				onInteractive: (result) => {
					console.log(renderVendorsTable(result.vendors ?? []));
					if (result.pagination) {
						printPaginationHint(result.pagination);
					}
				},
			},
			globalOpts,
		);
	});
