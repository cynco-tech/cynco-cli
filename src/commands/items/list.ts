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
import type { Item } from './utils';
import { renderItemsTable } from './utils';

type ListResponse = {
	items: Item[];
	pagination?: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
};

export const listItemsCmd = new Command('list')
	.alias('ls')
	.description('List items')
	.option('-l, --limit <n>', 'Max results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco items list', 'cynco items ls --limit 50', 'cynco items list --page 2'],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		const limit = parseLimitOpt(opts.limit, globalOpts);
		const page = parsePageOpt(opts.page, globalOpts);
		const params = buildPaginationParams(page, limit);

		await runList<ListResponse>(
			{
				spinner: {
					loading: 'Fetching items...',
					success: 'Items loaded',
					fail: 'Failed to fetch items',
				},
				apiCall: (client) => client.get('/items', params),
				onInteractive: (result) => {
					console.log(renderItemsTable(result.items ?? []));
					if (result.pagination) {
						printPaginationHint(result.pagination);
					}
				},
			},
			globalOpts,
		);
	});
