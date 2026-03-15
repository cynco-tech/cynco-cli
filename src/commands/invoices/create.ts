import { Command } from '@commander-js/extra-typings';
import { runCreate } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { formatMoney, statusIndicator } from '../../lib/format';
import { buildHelpText } from '../../lib/help-text';
import { outputError } from '../../lib/output';
import { requireText } from '../../lib/prompts';
import type { Invoice } from './utils';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createInvoiceCmd = new Command('create')
	.description('Create a new invoice')
	.option('--customer-id <id>', 'Customer ID')
	.option('--currency <code>', 'Currency code', 'MYR')
	.option('--due-date <date>', 'Due date (YYYY-MM-DD)')
	.option('--memo <text>', 'Invoice memo or notes')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco invoices create',
				'cynco invoices create --customer-id cust_abc123',
				'cynco invoices create --customer-id cust_abc123 --currency USD --due-date 2026-04-01',
				'cynco invoices create --customer-id cust_abc123 --memo "March services"',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		const customerId = await requireText(
			opts.customerId,
			{
				message: 'Customer ID',
				placeholder: 'cust_...',
			},
			{
				message: 'Customer ID is required. Use --customer-id <id>',
				code: 'missing_customer_id',
			},
			globalOpts,
		);

		const body: Record<string, unknown> = {
			customerId,
			currency: opts.currency,
		};

		if (opts.dueDate) {
			if (!DATE_REGEX.test(opts.dueDate) || Number.isNaN(Date.parse(opts.dueDate))) {
				outputError(
					{
						message: `Invalid --due-date format: "${opts.dueDate}". Expected YYYY-MM-DD (e.g. 2026-04-01).`,
						code: 'invalid_date',
					},
					{ json: globalOpts.json },
				);
			}
			body.dueDate = opts.dueDate;
		}

		if (opts.memo) {
			body.memo = opts.memo;
		}

		await runCreate<Invoice>(
			{
				spinner: {
					loading: 'Creating invoice...',
					success: 'Invoice created',
					fail: 'Failed to create invoice',
				},
				apiCall: (client) => client.post('/invoices', body),
				onInteractive: (invoice) => {
					console.log();
					console.log(`  Invoice:    ${invoice.invoiceNumber ?? invoice.id}`);
					console.log(`  ID:         ${invoice.id}`);
					console.log(`  Customer:   ${invoice.customerName ?? '-'}`);
					console.log(`  Status:     ${statusIndicator(invoice.status)}`);
					console.log(`  Total:      ${formatMoney(invoice.total, invoice.currency)}`);
					console.log(`  Currency:   ${invoice.currency ?? '-'}`);
					console.log(`  Due Date:   ${invoice.dueDate ?? '-'}`);
					console.log();
				},
			},
			globalOpts,
		);
	});
