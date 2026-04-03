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
import type { Invoice, InvoiceListResponse } from '../../types/invoice';
import { renderInvoicesTable } from './utils';

export const listInvoicesCmd = new Command('list')
	.alias('ls')
	.description('List invoices')
	.option('-l, --limit <n>', 'Max results per page (1-100)', '20')
	.option('--page <n>', 'Page number', '1')
	.option('--status <status>', 'Filter by status (draft|finalized|sent|paid|overdue|void)')
	.option('-s, --search <query>', 'Search by invoice number, customer name, or memo')
	.option('--from <date>', 'Filter from date (YYYY-MM-DD)')
	.option('--to <date>', 'Filter to date (YYYY-MM-DD)')
	.option('--min-amount <n>', 'Minimum total amount')
	.option('--max-amount <n>', 'Maximum total amount')
	.option('--customer-id <id>', 'Filter by customer ID')
	.option('--sort <field>', 'Sort field', 'createdAt')
	.option('--order <dir>', 'Sort order (asc|desc)', 'desc')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco invoices list',
				'cynco invoices ls --limit 50',
				'cynco invoices list --status paid',
				'cynco invoices list --search "Acme"',
				'cynco invoices list --from 2026-01-01 --to 2026-03-31',
				'cynco invoices list --sort dueDate --order asc',
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
			minAmount: opts.minAmount,
			maxAmount: opts.maxAmount,
			customerId: opts.customerId,
		});

		await runList<InvoiceListResponse>(
			{
				spinner: {
					loading: 'Fetching invoices...',
					success: 'Invoices loaded',
					fail: 'Failed to fetch invoices',
				},
				apiCall: (client) => client.get('/invoices', params),
				onInteractive: (result) => {
					console.log(renderInvoicesTable(result.invoices ?? []));
					if (result.pagination) {
						printPaginationHint(result.pagination);
					}
				},
				csv: {
					headers: ['Number', 'Customer', 'Status', 'Total', 'Currency', 'Due Date', 'ID'],
					toRow: (inv: Invoice) => [
						inv.invoiceNumber ?? '',
						inv.customerName ?? '',
						inv.status ?? '',
						formatMoney(inv.total, inv.currency),
						inv.currency ?? '',
						inv.dueDate ?? '',
						inv.id,
					],
					getItems: (r) => (r as InvoiceListResponse).invoices ?? [],
				},
			},
			globalOpts,
		);
	});
