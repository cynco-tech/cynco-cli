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
import type { Vendor, VendorListResponse } from '../../types/vendor';
import { renderVendorsTable } from './utils';

export const listVendorsCmd = new Command('list')
	.alias('ls')
	.description('List vendors')
	.option('-l, --limit <n>', 'Max results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.option('-s, --search <query>', 'Search by name or email')
	.option('--sort <field>', 'Sort field', 'createdAt')
	.option('--order <dir>', 'Sort order (asc|desc)', 'desc')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco vendors list',
				'cynco vendors ls --limit 50',
				'cynco vendors list --search "Parts"',
				'cynco vendors list --sort name --order asc',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		const limit = parseLimitOpt(opts.limit, globalOpts);
		const page = parsePageOpt(opts.page, globalOpts);
		const params = buildFilterParams(buildPaginationParams(page, limit, opts.sort, opts.order), {
			search: opts.search,
		});

		await runList<VendorListResponse>(
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
				csv: {
					headers: ['Name', 'Email', 'Phone', 'Country', 'ID'],
					toRow: (v: Vendor) => [v.name ?? '', v.email ?? '', v.phone ?? '', v.country ?? '', v.id],
					getItems: (r) => (r as VendorListResponse).vendors ?? [],
				},
			},
			globalOpts,
		);
	});
