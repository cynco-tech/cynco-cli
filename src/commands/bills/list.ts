import { Command } from '@commander-js/extra-typings';
import { runList } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { buildPaginationParams, parseLimitOpt, parsePageOpt } from '../../lib/pagination';
import type { Bill } from './utils';
import { renderBillsTable } from './utils';

export const listBillsCmd = new Command('list')
	.alias('ls')
	.description('List bills')
	.option('-l, --limit <n>', 'Max results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.option('--status <status>', 'Filter by status (draft|finalized|sent|paid|overdue|void)')
	.option('--sort <field>', 'Sort field', 'created_at')
	.option('--order <dir>', 'Sort order (asc|desc)', 'desc')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco bills list',
				'cynco bills ls --limit 50',
				'cynco bills list --status paid',
				'cynco bills list --sort dueDate --order asc',
				'cynco bills list --page 2',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		const limit = parseLimitOpt(opts.limit, globalOpts);
		const page = parsePageOpt(opts.page, globalOpts);
		const params = buildPaginationParams(page, limit, opts.sort, opts.order);
		if (opts.status) {
			params.status = opts.status;
		}

		await runList<Bill[]>(
			{
				spinner: {
					loading: 'Fetching bills...',
					success: 'Bills loaded',
					fail: 'Failed to fetch bills',
				},
				apiCall: (client) => client.get('/bills', params),
				onInteractive: (result) => {
					console.log(renderBillsTable(result ?? []));
				},
			},
			globalOpts,
		);
	});
