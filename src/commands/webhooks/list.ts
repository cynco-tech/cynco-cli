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
import type { Webhook, WebhookListResponse } from '../../types/webhook';
import { renderWebhooksTable } from './utils';

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

		await runList<WebhookListResponse>(
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
				csv: {
					headers: ['URL', 'Events', 'Active', 'ID'],
					toRow: (wh: Webhook) => [
						wh.url ?? '',
						wh.events?.join('; ') ?? '',
						wh.active == null ? '' : wh.active ? 'yes' : 'no',
						wh.id,
					],
					getItems: (r) => (r as WebhookListResponse).webhooks ?? [],
				},
			},
			globalOpts,
		);
	});
