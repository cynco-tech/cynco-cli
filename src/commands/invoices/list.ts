import { Command } from '@commander-js/extra-typings';
import { runList } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { buildPaginationParams, parseLimitOpt, parsePageOpt } from '../../lib/pagination';
import type { Invoice } from './utils';
import { renderInvoicesTable } from './utils';

export const listInvoicesCmd = new Command('list')
	.alias('ls')
	.description('List invoices')
	.option('-l, --limit <n>', 'Max results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.option('--status <status>', 'Filter by status (draft|finalized|sent|paid|overdue|void)')
	.option('--sort <field>', 'Sort field', 'created_at')
	.option('--order <dir>', 'Sort order (asc|desc)', 'desc')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco invoices list',
				'cynco invoices ls --limit 50',
				'cynco invoices list --status paid',
				'cynco invoices list --sort dueDate --order asc',
				'cynco invoices list --page 2',
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

		await runList<Invoice[]>(
			{
				spinner: {
					loading: 'Fetching invoices...',
					success: 'Invoices loaded',
					fail: 'Failed to fetch invoices',
				},
				apiCall: (client) => client.get('/invoices', params),
				onInteractive: (result) => {
					console.log(renderInvoicesTable(result ?? []));
				},
			},
			globalOpts,
		);
	});
