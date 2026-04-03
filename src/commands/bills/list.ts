import { Command } from '@commander-js/extra-typings';
import { runList } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { formatMoney } from '../../lib/format';
import { buildHelpText } from '../../lib/help-text';
import {
	buildFilterParams,
	buildPaginationParams,
	parseLimitOpt,
	parsePageOpt,
	printPaginationHint,
} from '../../lib/pagination';
import type { Bill, BillListResponse } from '../../types/bill';
import { renderBillsTable } from './utils';

export const listBillsCmd = new Command('list')
	.alias('ls')
	.description('List bills')
	.option('-l, --limit <n>', 'Max results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.option('--status <status>', 'Filter by status (draft|finalized|sent|paid|overdue|void)')
	.option('-s, --search <query>', 'Search by bill number, vendor name')
	.option('--from <date>', 'Filter from date (YYYY-MM-DD)')
	.option('--to <date>', 'Filter to date (YYYY-MM-DD)')
	.option('--vendor-id <id>', 'Filter by vendor ID')
	.option('--sort <field>', 'Sort field', 'createdAt')
	.option('--order <dir>', 'Sort order (asc|desc)', 'desc')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco bills list',
				'cynco bills ls --limit 50',
				'cynco bills list --status paid',
				'cynco bills list --search "Parts"',
				'cynco bills list --from 2026-01-01 --to 2026-03-31',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		const limit = parseLimitOpt(opts.limit, globalOpts);
		const page = parsePageOpt(opts.page, globalOpts);
		const params = buildFilterParams(buildPaginationParams(page, limit, opts.sort, opts.order), {
			status: opts.status,
			search: opts.search,
			from: opts.from,
			to: opts.to,
			vendorId: opts.vendorId,
		});

		await runList<BillListResponse>(
			{
				spinner: {
					loading: 'Fetching bills...',
					success: 'Bills loaded',
					fail: 'Failed to fetch bills',
				},
				apiCall: (client) => client.get('/bills', params),
				onInteractive: (result) => {
					console.log(renderBillsTable(result.bills ?? []));
					if (result.pagination) {
						printPaginationHint(result.pagination);
					}
				},
				csv: {
					headers: ['Number', 'Vendor', 'Status', 'Total', 'Currency', 'Due Date', 'ID'],
					toRow: (b: Bill) => [
						b.billNumber ?? '',
						b.vendorName ?? '',
						b.status ?? '',
						formatMoney(b.total, b.currency),
						b.currency ?? '',
						b.dueDate ?? '',
						b.id,
					],
					getItems: (r) => (r as BillListResponse).bills ?? [],
				},
			},
			globalOpts,
		);
	});
