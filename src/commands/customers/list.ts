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
import type { Customer, CustomerListResponse } from '../../types/customer';
import { renderCustomersTable } from './utils';

export const listCustomersCmd = new Command('list')
	.alias('ls')
	.description('List customers')
	.option('-l, --limit <n>', 'Max results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.option('-s, --search <query>', 'Search by name or email')
	.option('--sort <field>', 'Sort field', 'createdAt')
	.option('--order <dir>', 'Sort order (asc|desc)', 'desc')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco customers list',
				'cynco customers ls --limit 50',
				'cynco customers list --search "Acme"',
				'cynco customers list --sort name --order asc',
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

		await runList<CustomerListResponse>(
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
				csv: {
					headers: ['Name', 'Email', 'Phone', 'Country', 'ID'],
					toRow: (c: Customer) => [
						c.name ?? '',
						c.email ?? '',
						c.phone ?? '',
						c.country ?? '',
						c.id,
					],
					getItems: (r) => (r as CustomerListResponse).customers ?? [],
				},
			},
			globalOpts,
		);
	});
