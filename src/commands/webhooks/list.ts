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
import type { Webhook } from './utils';
import { renderWebhooksTable } from './utils';

type ListResponse = {
	webhooks: Webhook[];
	pagination?: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
};

export const listWebhooksCmd = new Command('list')
	.alias('ls')
	.description('List webhooks')
	.option('-l, --limit <n>', 'Max results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco webhooks list', 'cynco webhooks ls', 'cynco webhooks list --limit 50'],
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
					loading: 'Fetching webhooks...',
					success: 'Webhooks loaded',
					fail: 'Failed to fetch webhooks',
				},
				apiCall: (client) => client.get('/webhooks', params),
				onInteractive: (result) => {
					console.log(renderWebhooksTable(result.webhooks ?? []));
					if (result.pagination) {
						printPaginationHint(result.pagination);
					}
				},
			},
			globalOpts,
		);
	});
