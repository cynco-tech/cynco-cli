import { Command } from '@commander-js/extra-typings';
import { runList } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { formatMoney, formatPercent } from '../../lib/format';
import { buildHelpText } from '../../lib/help-text';
import {
	buildFilterParams,
	buildPaginationParams,
	parseLimitOpt,
	parsePageOpt,
	printPaginationHint,
} from '../../lib/pagination';
import type { Item, ItemListResponse } from '../../types/item';
import { renderItemsTable } from './utils';

export const listItemsCmd = new Command('list')
	.alias('ls')
	.description('List items')
	.option('-l, --limit <n>', 'Max results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.option('-s, --search <query>', 'Search by name or description')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco items list',
				'cynco items ls --limit 50',
				'cynco items list --search "Widget"',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		const limit = parseLimitOpt(opts.limit, globalOpts);
		const page = parsePageOpt(opts.page, globalOpts);
		const params = buildFilterParams(buildPaginationParams(page, limit), {
			search: opts.search,
		});

		await runList<ItemListResponse>(
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
				csv: {
					headers: ['Name', 'Description', 'Unit Price', 'Tax Rate', 'ID'],
					toRow: (item: Item) => [
						item.name ?? '',
						item.description ?? '',
						formatMoney(item.unitPrice),
						formatPercent(item.taxRate),
						item.id,
					],
					getItems: (r) => (r as ItemListResponse).items ?? [],
				},
			},
			globalOpts,
		);
	});
